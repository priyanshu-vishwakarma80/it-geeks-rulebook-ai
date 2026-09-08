import json
import pytest
from pathlib import Path
from backend.app.engine import RulebookEngine
from backend.app.models import ResponseType
from backend.app.config import UNANSWERABLE_JSON_PATH


@pytest.fixture(scope="module")
def engine():
    return RulebookEngine()


@pytest.fixture(scope="module")
def unanswerable_questions():
    with open(UNANSWERABLE_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_unanswerable_count(unanswerable_questions):
    """Verifies that exactly 25 hard unanswerable questions are specified."""
    assert len(unanswerable_questions) == 25, f"Expected 25 questions, found {len(unanswerable_questions)}"


def test_all_25_unanswerable_return_not_covered(engine, unanswerable_questions):
    """
    Asserts that every single one of the 25 out-of-scope questions is correctly
    identified as NOT_COVERED, preventing hallucination.
    """
    failures = []
    for item in unanswerable_questions:
        q = item["question"]
        resp = engine.ask(q)
        if resp.type != ResponseType.NOT_COVERED:
            failures.append({
                "id": item["id"],
                "question": q,
                "expected": "not_covered",
                "got": resp.type.value
            })

    assert len(failures) == 0, f"Failed on {len(failures)} unanswerable questions: {failures}"
