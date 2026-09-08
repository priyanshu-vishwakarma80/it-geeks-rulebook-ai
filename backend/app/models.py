from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ResponseType(str, Enum):
    ANSWERED = "answered"
    CONFLICT = "conflict"
    NOT_COVERED = "not_covered"


class Citation(BaseModel):
    document: str = Field(..., description="Source document name, e.g., academic_regulations.md")
    section: str = Field(..., description="Section title or clause code")
    text: str = Field(..., description="Quoted text or excerpt from the corpus")
    similarity_score: float = Field(..., description="Relevance similarity score (0.0 to 1.0)")
    clause_id: Optional[str] = Field(None, description="Optional chunk or clause identifier")


class ConflictingClause(BaseModel):
    document: str = Field(..., description="Document where this conflicting clause appears")
    section: str = Field(..., description="Section or clause heading")
    quote: str = Field(..., description="Exact contradictory quote or policy statement")


class ConflictDetail(BaseModel):
    topic: str = Field(..., description="Subject of the contradiction")
    explanation: str = Field(..., description="Analytical breakdown of why and how these clauses contradict")
    clauses: List[ConflictingClause] = Field(..., description="The two or more opposing clauses")


class AskRequest(BaseModel):
    query: str = Field(..., min_length=2, description="The student or user question")
    top_k: int = Field(5, ge=1, le=15, description="Number of passages to retrieve for reasoning")


class AskResponse(BaseModel):
    query: str
    type: ResponseType
    answer: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    citations: List[Citation] = Field(default_factory=list)
    conflict: Optional[ConflictDetail] = None
    reasoning: Optional[str] = None


class CorpusDocInfo(BaseModel):
    name: str
    format: str
    words: int
    chunks: int


class CorpusMetadataResponse(BaseModel):
    total_words: int
    total_chunks: int
    documents: List[CorpusDocInfo]


class EvalItemResult(BaseModel):
    test_id: str
    query: str
    expected_type: ResponseType
    predicted_type: ResponseType
    passed: bool
    details: Optional[str] = None


class EvalSummaryResponse(BaseModel):
    total_tests: int
    passed_tests: int
    failed_tests: int
    accuracy_percentage: float
    breakdown: dict
    results: List[EvalItemResult]
