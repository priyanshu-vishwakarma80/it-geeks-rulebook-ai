import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.app.config import FRONTEND_DIR, CORPUS_DIR, CONTRADICTIONS_JSON_PATH, UNANSWERABLE_JSON_PATH
from backend.app.models import (
    AskRequest, AskResponse, ResponseType, CorpusMetadataResponse,
    EvalSummaryResponse, EvalItemResult
)
from backend.app.corpus_loader import get_corpus
from backend.app.engine import RulebookEngine
from backend.app.database import init_db, log_query, get_recent_queries, log_eval_run

# Initialize FastAPI App
app = FastAPI(
    title="The Rulebook That Argues With Itself",
    description="Intelligent Question-Answering Service over University Regulations with Contradiction & Silence Detection",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database and Engine singletons
init_db()
engine = RulebookEngine()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Rulebook Q&A Engine", "version": "1.0.0"}


@app.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest):
    """
    Main Q&A endpoint required by IT Geeks specification.
    Returns:
      1. answered (with citations, section references, similarity scores)
      2. conflict (when two or more sections disagree)
      3. not_covered (when the corpus is silent)
    """
    try:
        response = engine.ask(request.query, top_k=request.top_k)
        
        # Log to SQLite
        conflict_topic = response.conflict.topic if response.conflict else None
        log_query(
            query=response.query,
            response_type=response.type.value,
            answer=response.answer,
            confidence_score=response.confidence_score,
            citations_count=len(response.citations),
            conflict_topic=conflict_topic,
            raw_response=response.model_dump_json()
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/corpus", response_model=CorpusMetadataResponse)
def get_corpus_metadata():
    """Returns total word count, total chunks, and document breakdowns."""
    corpus = get_corpus()
    meta = corpus.metadata
    return CorpusMetadataResponse(
        total_words=meta.get("total_words", 0),
        total_chunks=meta.get("total_chunks", 0),
        documents=meta.get("documents", [])
    )


@app.get("/corpus/chunks")
def get_all_chunks():
    """Returns all parsed chunks for inspection."""
    corpus = get_corpus()
    return {"chunks": corpus.chunks}


@app.get("/test-suite")
def get_test_suite():
    """Returns the ground truth test sets: 3 planted contradictions, 25 unanswerable questions, and positive questions."""
    with open(CONTRADICTIONS_JSON_PATH, "r", encoding="utf-8") as f:
        contradictions = json.load(f)

    with open(UNANSWERABLE_JSON_PATH, "r", encoding="utf-8") as f:
        unanswerable = json.load(f)

    positive_queries = [
        {"id": "ANSWERED-01", "query": "What letter grades are used and what grade points correspond to them?", "expected": "answered"},
        {"id": "ANSWERED-02", "query": "How many total credits are required to graduate with a B.Tech degree?", "expected": "answered"},
        {"id": "ANSWERED-03", "query": "What is the fee and duration of the summer remedial term?", "expected": "answered"},
        {"id": "ANSWERED-04", "query": "What is the fine for late registration during the grace period?", "expected": "answered"},
        {"id": "ANSWERED-05", "query": "What is the maximum allowed similarity percentage before an assignment is flagged for plagiarism?", "expected": "answered"},
        {"id": "ANSWERED-06", "query": "What electrical heating appliances are strictly prohibited inside hostel rooms?", "expected": "answered"},
        {"id": "ANSWERED-07", "query": "What are the breakfast and dinner meal timings in the central student mess?", "expected": "answered"},
        {"id": "ANSWERED-08", "query": "What are the permitted visiting hours for parents in the hostel visitor lounge?", "expected": "answered"}
    ]

    return {
        "contradictions": contradictions,
        "unanswerable_questions": unanswerable,
        "positive_queries": positive_queries
    }


@app.post("/eval/run", response_model=EvalSummaryResponse)
def run_evaluation_benchmark():
    """
    Runs automated evaluation across all 25 unanswerable queries, 3 planted contradictions,
    and 8 positive queries. Computes precision, recall, and overall accuracy.
    """
    test_suite = get_test_suite()
    results: List[EvalItemResult] = []

    # 1. Evaluate Contradictions (Expected: CONFLICT)
    for c in test_suite["contradictions"]:
        for q in c["sample_queries"][:2]: # run 2 queries per contradiction
            resp = engine.ask(q)
            passed = resp.type == ResponseType.CONFLICT
            results.append(EvalItemResult(
                test_id=f"{c['id']}-sample",
                query=q,
                expected_type=ResponseType.CONFLICT,
                predicted_type=resp.type,
                passed=passed,
                details=f"Topic: {c['topic']}"
            ))

    # 2. Evaluate Unanswerable Questions (Expected: NOT_COVERED)
    for u in test_suite["unanswerable_questions"]:
        resp = engine.ask(u["question"])
        passed = resp.type == ResponseType.NOT_COVERED
        results.append(EvalItemResult(
            test_id=u["id"],
            query=u["question"],
            expected_type=ResponseType.NOT_COVERED,
            predicted_type=resp.type,
            passed=passed,
            details=f"Reason: {u['reason']}"
        ))

    # 3. Evaluate Positive Answerable Queries (Expected: ANSWERED)
    for p in test_suite["positive_queries"]:
        resp = engine.ask(p["query"])
        passed = resp.type == ResponseType.ANSWERED
        results.append(EvalItemResult(
            test_id=p["id"],
            query=p["query"],
            expected_type=ResponseType.ANSWERED,
            predicted_type=resp.type,
            passed=passed,
            details=f"Citations found: {len(resp.citations)}"
        ))

    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = total - passed
    accuracy = round((passed / total) * 100, 2) if total > 0 else 0.0

    breakdown = {
        "contradictions_accuracy": round((sum(1 for r in results if r.expected_type == ResponseType.CONFLICT and r.passed) / max(1, sum(1 for r in results if r.expected_type == ResponseType.CONFLICT))) * 100, 1),
        "silence_accuracy": round((sum(1 for r in results if r.expected_type == ResponseType.NOT_COVERED and r.passed) / max(1, sum(1 for r in results if r.expected_type == ResponseType.NOT_COVERED))) * 100, 1),
        "answered_accuracy": round((sum(1 for r in results if r.expected_type == ResponseType.ANSWERED and r.passed) / max(1, sum(1 for r in results if r.expected_type == ResponseType.ANSWERED))) * 100, 1)
    }

    log_eval_run(total, passed, failed, accuracy, {"breakdown": breakdown})

    return EvalSummaryResponse(
        total_tests=total,
        passed_tests=passed,
        failed_tests=failed,
        accuracy_percentage=accuracy,
        breakdown=breakdown,
        results=results
    )


@app.get("/history")
def get_query_history():
    """Returns recent query logs from SQLite."""
    return {"history": get_recent_queries(30)}


# Mount static frontend directory
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")
