import re
import math
from typing import List, Dict, Any, Tuple
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.app.corpus_loader import get_corpus


class BM25Okapi:
    """Lightweight in-memory BM25 ranker."""
    def __init__(self, corpus: List[List[str]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = len(corpus)
        self.avgdl = sum(len(doc) for doc in corpus) / (self.corpus_size if self.corpus_size > 0 else 1)
        self.doc_freqs: List[Dict[str, int]] = []
        self.idf: Dict[str, float] = {}
        self.doc_lens = [len(doc) for doc in corpus]

        # Calculate IDF
        df: Dict[str, int] = {}
        for doc in corpus:
            freqs = Counter(doc)
            self.doc_freqs.append(freqs)
            for word in freqs.keys():
                df[word] = df.get(word, 0) + 1

        for word, freq in df.items():
            # BM25 standard IDF with smoothing
            self.idf[word] = math.log((self.corpus_size - freq + 0.5) / (freq + 0.5) + 1.0)

    def get_scores(self, query: List[str]) -> List[float]:
        scores = [0.0] * self.corpus_size
        for term in query:
            if term not in self.idf:
                continue
            idf_val = self.idf[term]
            for idx, freqs in enumerate(self.doc_freqs):
                tf = freqs.get(term, 0)
                if tf == 0:
                    continue
                doc_len = self.doc_lens[idx]
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * (doc_len / self.avgdl))
                scores[idx] += idf_val * (numerator / denominator)
        return scores


class HybridRetriever:
    def __init__(self):
        self.corpus_loader = get_corpus()
        self.chunks = self.corpus_loader.chunks
        self._init_indices()

    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_\-\.%]+\b', text) if len(w) > 1]

    def _init_indices(self):
        # 1. Prepare texts
        self.corpus_texts = [
            f"{c.get('section', '')} {c.get('text', '')}"
            for c in self.chunks
        ]

        # 2. Dense / Subword N-Gram TF-IDF Vectorizer
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            analyzer='word',
            sublinear_tf=True,
            min_df=1,
            max_df=0.98
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus_texts)

        # 3. BM25 Tokenized Corpus
        tokenized_corpus = [self._tokenize(t) for t in self.corpus_texts]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not query or not query.strip():
            return []

        # Dense Cosine Similarity
        query_vec = self.vectorizer.transform([query])
        dense_scores = cosine_similarity(query_vec, self.tfidf_matrix)[0]

        # BM25 Lexical Scores
        query_tokens = self._tokenize(query)
        bm25_raw = self.bm25.get_scores(query_tokens)
        max_bm25 = max(bm25_raw) if bm25_raw and max(bm25_raw) > 0 else 1.0
        bm25_norm = [s / max_bm25 for s in bm25_raw]

        # Hybrid Weighted Fusion
        scored_chunks = []
        for idx, chunk in enumerate(self.chunks):
            d_score = float(dense_scores[idx])
            b_score = float(bm25_norm[idx])
            
            # Hybrid combined score: 0.55 dense + 0.45 BM25
            combined = (0.55 * d_score) + (0.45 * b_score)
            
            # Normalize to clean 0.0 - 1.0 range with 3 decimals
            score = round(min(1.0, max(0.0, combined)), 4)
            
            scored_chunks.append({
                "chunk_id": chunk["chunk_id"],
                "document": chunk["document"],
                "section": chunk["section"],
                "text": chunk["text"],
                "doc_format": chunk.get("doc_format", "text"),
                "similarity_score": score,
                "dense_score": round(d_score, 4),
                "bm25_score": round(b_score, 4)
            })

        # Sort descending by similarity score
        scored_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_chunks[:top_k]
