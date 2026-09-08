import sqlite3
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from backend.app.config import DATABASE_PATH, DATA_DIR


def get_db_connection():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            query TEXT NOT NULL,
            response_type TEXT NOT NULL,
            answer TEXT NOT NULL,
            confidence_score REAL NOT NULL,
            citations_count INTEGER NOT NULL,
            conflict_topic TEXT,
            raw_response TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS eval_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            total_tests INTEGER NOT NULL,
            passed_tests INTEGER NOT NULL,
            failed_tests INTEGER NOT NULL,
            accuracy_percentage REAL NOT NULL,
            details_json TEXT
        )
    """)

    conn.commit()
    conn.close()


def log_query(
    query: str,
    response_type: str,
    answer: str,
    confidence_score: float,
    citations_count: int,
    conflict_topic: Optional[str] = None,
    raw_response: Optional[str] = None
) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """
        INSERT INTO queries (timestamp, query, response_type, answer, confidence_score, citations_count, conflict_topic, raw_response)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (now, query, response_type, answer, confidence_score, citations_count, conflict_topic, raw_response)
    )
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def get_recent_queries(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM queries ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def log_eval_run(total: int, passed: int, failed: int, accuracy: float, details: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """
        INSERT INTO eval_runs (timestamp, total_tests, passed_tests, failed_tests, accuracy_percentage, details_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (now, total, passed, failed, accuracy, json.dumps(details))
    )
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id
