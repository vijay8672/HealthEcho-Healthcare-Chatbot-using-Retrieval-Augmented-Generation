"""
Vector similarity search for document retrieval.
"""
from typing import List, Dict, Any
import numpy as np

from ..utils.logger import get_logger
from ..database.vector_store import VectorStore
from ..document_processing.embedding_generator import EmbeddingGenerator
from ..config import SIMILARITY_THRESHOLD

logger = get_logger(__name__)


class VectorSearch:
    """Vector similarity search for document retrieval."""

    def __init__(self,
                 vector_store: VectorStore = None,
                 embedding_generator: EmbeddingGenerator = None):
        self.vector_store = vector_store or VectorStore()
        self.embedding_generator = embedding_generator or EmbeddingGenerator()

    def search(self, query: str, top_k: int = 5, prioritize_files: List[str] = None) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query.

        Args:
            query: Query text
            top_k: Number of results to return (default = 5)
            prioritize_files: List of filenames to prioritize in search results

        Returns:
            List of document dictionaries with similarity scores
        """
        try:
            query_embedding = self.embedding_generator.generate_query_embedding(query)
            search_top_k = min(top_k * 2, 20)

            results = self.vector_store.search(query_embedding=query_embedding, top_k=search_top_k)

            if results:
                max_score = max(doc["score"] for doc in results)
                dynamic_threshold = max(SIMILARITY_THRESHOLD, max_score * 0.7)

                filtered_results = [doc for doc in results if doc["score"] > dynamic_threshold]

                if len(filtered_results) < 2 and len(results) > 2:
                    filtered_results = [doc for doc in results if doc["score"] > SIMILARITY_THRESHOLD]
            else:
                filtered_results = []

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

            logger.info(f"Found {len(filtered_results)} relevant documents (from {len(results)} candidates)")
            if filtered_results:
                logger.info(f"Score range: {filtered_results[0]['score']:.3f} - {filtered_results[-1]['score']:.3f}")
                if prioritize_files:
                    prioritized_count = sum(doc.get("prioritized", False) for doc in filtered_results)
                    logger.info(f"{prioritized_count} results are from prioritized files")

            return filtered_results

        except Exception as e:
            logger.error(f"Error during search: {e}")
            return []
