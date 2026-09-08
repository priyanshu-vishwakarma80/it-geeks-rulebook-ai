import json
import logging
from typing import List, Dict, Any
from backend.app.config import CHUNKS_JSON_PATH, CORPUS_DIR, ACADEMIC_REGS_PATH, FEE_SCHEDULE_PATH, HOSTEL_PDF_PATH
from backend.scripts.build_corpus import build_and_verify

logger = logging.getLogger("rulebook.corpus")


class CorpusLoader:
    _instance = None
    _chunks: List[Dict[str, Any]] = []
    _metadata: Dict[str, Any] = {}

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance.load()
        return cls._instance

    def load(self, force_rebuild: bool = False):
        if not CHUNKS_JSON_PATH.exists() or force_rebuild or not HOSTEL_PDF_PATH.exists():
            logger.info("Corpus cache missing or rebuild requested. Building corpus...")
            build_and_verify()

        with open(CHUNKS_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        self._metadata = data.get("metadata", {})
        self._chunks = data.get("chunks", [])
        logger.info(f"Loaded {len(self._chunks)} chunks ({self._metadata.get('total_words', 0)} words) from corpus.")

    @property
    def chunks(self) -> List[Dict[str, Any]]:
        if not self._chunks:
            self.load()
        return self._chunks

    @property
    def metadata(self) -> Dict[str, Any]:
        if not self._metadata:
            self.load()
        return self._metadata


def get_corpus() -> CorpusLoader:
    return CorpusLoader.get_instance()
