import pytest
from backend.app.engine import RulebookEngine
from backend.app.models import ResponseType


@pytest.fixture(scope="module")
def engine():
    return RulebookEngine()


class TestContradictionDetection:
    """Verifies that the engine correctly identifies the 3 planted regulatory contradictions."""

    def test_contradiction_1_attendance_threshold(self, engine):
        """Tests Contradiction 1: 75% strict mandatory vs 65% medical vs 50% Dean waiver."""
        queries = [
            "What is the minimum attendance required to sit for exams if I have a medical certificate?",
            "Can the Dean waive my attendance below 75% if I fall sick?",
            "What happens if my attendance is 68% due to hospitalization?"
        ]
        for q in queries:
            resp = engine.ask(q)
            assert resp.type == ResponseType.CONFLICT, f"Expected CONFLICT for query: {q}, got {resp.type}"
            assert resp.conflict is not None
            assert len(resp.conflict.clauses) >= 2
            assert "Attendance" in resp.conflict.topic

    def test_contradiction_2_fee_refund_bracket(self, engine):
        """Tests Contradiction 2: Fee Schedule REF-02 (80% refund Day 8-14) vs Academic Regs 6.4 (0% refund after Day 7)."""
        queries = [
            "If I withdraw from a course on day 10 of the semester, what refund percentage do I get?",
            "What is the refund policy if I drop a course in the second week?",
            "Does dropping a course on day 9 forfeit 100% of my fees or do I get a refund?"
        ]
        for q in queries:
            resp = engine.ask(q)
            assert resp.type == ResponseType.CONFLICT, f"Expected CONFLICT for query: {q}, got {resp.type}"
            assert resp.conflict is not None
            assert len(resp.conflict.clauses) >= 2
            assert "Refund" in resp.conflict.topic or "Withdrawal" in resp.conflict.topic

    def test_contradiction_3_night_curfew_vs_lab_access(self, engine):
        """Tests Contradiction 3: Hostel Handbook 3.1 (10 PM lockdown) vs Academic Regs 11.2 (24/7 lab access)."""
        queries = [
            "Can final year students work in the departmental research labs after 10 PM?",
            "Is there a 10 PM curfew for capstone project students working in the computing labs overnight?",
            "Can hostel students stay in the research lab past 10 PM?"
        ]
        for q in queries:
            resp = engine.ask(q)
            assert resp.type == ResponseType.CONFLICT, f"Expected CONFLICT for query: {q}, got {resp.type}"
            assert resp.conflict is not None
            assert len(resp.conflict.clauses) >= 2
            assert "Curfew" in resp.conflict.topic or "Lab Access" in resp.conflict.topic
