import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"


def test_corpus_endpoint(client):
    res = client.get("/corpus")
    assert res.status_code == 200
    data = res.json()
    assert data["total_words"] >= 6000
    assert len(data["documents"]) == 3


def test_test_suite_endpoint(client):
    res = client.get("/test-suite")
    assert res.status_code == 200
    data = res.json()
    assert len(data["contradictions"]) == 3
    assert len(data["unanswerable_questions"]) == 25


def test_post_ask_answered(client):
    payload = {"query": "What letter grades are used in the grading scale?", "top_k": 3}
    res = client.post("/ask", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "answered"
    assert len(data["citations"]) > 0
    assert "similarity_score" in data["citations"][0]


def test_post_ask_conflict(client):
    payload = {"query": "What is the minimum attendance required to sit for exams if I have a medical certificate?", "top_k": 5}
    res = client.post("/ask", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "conflict"
    assert data["conflict"] is not None
    assert len(data["conflict"]["clauses"]) >= 2


def test_post_ask_silence(client):
    payload = {"query": "Can I pay my semester tuition fees using Bitcoin, Ethereum, or cryptocurrency?", "top_k": 5}
    res = client.post("/ask", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "not_covered"


def test_eval_run_endpoint(client):
    res = client.post("/eval/run")
    assert res.status_code == 200
    data = res.json()
    assert data["total_tests"] >= 35
    assert data["accuracy_percentage"] >= 95.0
    assert data["failed_tests"] == 0
