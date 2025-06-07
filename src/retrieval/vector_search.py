"""
Vector similarity search for document retrieval.
"""
from typing import List, Dict, Any
import numpy as np
import time
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

from ..utils.logger import get_logger
from ..database.vector_store import VectorStore
from ..document_processing.embedding_generator import EmbeddingGenerator
from ..config import SIMILARITY_THRESHOLD, MAX_VECTOR_SEARCH_TOP_K

logger = get_logger(__name__)


class VectorSearch:
    """Vector similarity search for document retrieval."""

    def __init__(self,
                 vector_store: VectorStore = None,
                 embedding_generator: EmbeddingGenerator = None):
        self.vector_store = vector_store or VectorStore()
        self.embedding_generator = embedding_generator or EmbeddingGenerator()

    @retry(stop=stop_after_attempt(3), wait=wait_fixed(1), retry=retry_if_exception_type(Exception))
    def _generate_embedding(self, query: str) -> np.ndarray:
        return self.embedding_generator.generate_query_embedding(query)

    @retry(stop=stop_after_attempt(3), wait=wait_fixed(1), retry=retry_if_exception_type(Exception))
    def _vector_store_search(self, query_embedding: np.ndarray, top_k: int) -> List[Dict[str, Any]]:
        return self.vector_store.search(query_embedding=query_embedding, top_k=top_k)

    def search(self, query: str, top_k: int = 5, prioritize_files: List[str] = None) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query.

        Args:
            query (str): Query text.
            top_k (int): Number of top documents to return (default = 5).
            prioritize_files (List[str], optional): Boost scores of documents from these source files.

        Returns:
            List[Dict[str, Any]]: List of documents with metadata and similarity scores.
        """
        start_time = time.time()

        if not isinstance(query, str) or not query.strip():
            logger.warning("Invalid or empty query received.")
            return []

        try:
            query_embedding = self._generate_embedding(query)
            search_top_k = min(top_k * 2, MAX_VECTOR_SEARCH_TOP_K)

            results = self._vector_store_search(query_embedding=query_embedding, top_k=search_top_k)

            if not results:
                logger.info("No search results returned from vector store.")
                return []

            for i, doc in enumerate(results):
                if "score" not in doc or not isinstance(doc["score"], (int, float)):
                    logger.warning(f"Invalid result format at index {i}: {doc}")
                    return []

            max_score = max(doc["score"] for doc in results)
            dynamic_threshold = max(SIMILARITY_THRESHOLD, max_score * 0.7)
            filtered_results = [doc for doc in results if doc["score"] > dynamic_threshold]

            if len(filtered_results) < 2 and len(results) > 2:
                filtered_results = [doc for doc in results if doc["score"] > SIMILARITY_THRESHOLD]

            if prioritize_files and filtered_results:
                boosted_results = []
                for doc in filtered_results:
                    source_file = doc.get("source_file", "")
                    if any(pf in source_file for pf in prioritize_files):
                        doc["score"] = min(1.0, doc["score"] * 1.2)
                        doc["prioritized"] = True
                        logger.info(f"Boosted score for prioritized file: {source_file}")
                    else:
                        doc["prioritized"] = False
                    boosted_results.append(doc)

                boosted_results.sort(key=lambda x: x["score"], reverse=True)
                filtered_results = boosted_results

            filtered_results = filtered_results[:top_k]

            elapsed = time.time() - start_time
            logger.info(f"Search completed in {elapsed:.2f}s — {len(filtered_results)} relevant documents "
                        f"(from {len(results)} candidates)")

            if filtered_results:
                score_range = f"{filtered_results[0]['score']:.3f} - {filtered_results[-1]['score']:.3f}"
                logger.info(f"Score range: {score_range}")
                if prioritize_files:
                    prioritized_count = sum(doc.get("prioritized", False) for doc in filtered_results)
                    logger.info(f"{prioritized_count} results from prioritized files")

            return filtered_results

        except Exception as e:
            logger.exception("Error during vector search execution")
            return []
