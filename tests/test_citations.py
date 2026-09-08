import pytest
from backend.app.engine import RulebookEngine
from backend.app.models import ResponseType


@pytest.fixture(scope="module")
def engine():
    return RulebookEngine()


class TestAnsweredCitations:
    """Verifies standard positive queries return ANSWERED with precise citations and similarity scores."""

    @pytest.mark.parametrize("query,expected_section", [
        ("What letter grades are used and what grade points correspond to them?", "Grading"),
        ("How many total credits are required to graduate with a B.Tech degree?", "Credit"),
        ("What is the fee and duration of the summer remedial term?", "Summer"),
        ("What is the fine for late registration during the grace period?", "Late"),
        ("What is the maximum allowed similarity percentage before an assignment is flagged for plagiarism?", "Plagiarism"),
        ("What electrical heating appliances are strictly prohibited inside hostel rooms?", "Electrical"),
        ("What are the breakfast and dinner meal timings in the central student mess?", "Dining"),
        ("What are the permitted visiting hours for parents in the hostel visitor lounge?", "Visiting")
    ])
    def test_answered_with_citations(self, engine, query, expected_section):
        resp = engine.ask(query)
        assert resp.type == ResponseType.ANSWERED, f"Expected ANSWERED for: {query}, got {resp.type}"
        assert len(resp.citations) > 0, f"Expected non-empty citations for: {query}"
        
        # Verify citation structure
        top_cit = resp.citations[0]
        assert top_cit.document in ["academic_regulations.md", "fee_schedule.csv", "hostel_handbook.pdf"]
        assert top_cit.similarity_score > 0.0
        assert len(top_cit.text) > 20
        assert len(top_cit.section) > 3
