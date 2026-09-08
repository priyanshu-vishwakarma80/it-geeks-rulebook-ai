import os
from pathlib import Path

# Base Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = BACKEND_DIR.parent
CORPUS_DIR = BASE_DIR / "corpus"
DATA_DIR = BASE_DIR / "data"
FRONTEND_DIR = BASE_DIR / "frontend"

# Document Paths
ACADEMIC_REGS_PATH = CORPUS_DIR / "academic_regulations.md"
FEE_SCHEDULE_PATH = CORPUS_DIR / "fee_schedule.csv"
HOSTEL_PDF_PATH = CORPUS_DIR / "hostel_handbook.pdf"
HOSTEL_TXT_PATH = CORPUS_DIR / "raw" / "hostel_handbook.txt"

# Data & Cache Paths
CHUNKS_JSON_PATH = DATA_DIR / "corpus_chunks.json"
CONTRADICTIONS_JSON_PATH = DATA_DIR / "planted_contradictions.json"
UNANSWERABLE_JSON_PATH = DATA_DIR / "unanswerable_questions.json"
DATABASE_PATH = DATA_DIR / "rulebook.db"

# Engine Thresholds
# Threshold below which query is considered outside corpus coverage (silent)
SILENCE_SIMILARITY_THRESHOLD = 0.22
KEYWORD_MIN_SCORE = 0.15

# Conflict Detection Sensitivity
CONFLICT_CONFIDENCE_THRESHOLD = 0.45

# API Server Settings
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
