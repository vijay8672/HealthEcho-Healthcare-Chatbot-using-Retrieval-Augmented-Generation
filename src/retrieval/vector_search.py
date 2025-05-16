"""
Vector similarity search for document retrieval.
"""
from typing import List, Dict, Any
import numpy as np

from ..utils.logger import get_logger
from ..database.vector_store import VectorStore
from ..document_processing.embedding_generator import EmbeddingGenerator
from ..config import SIMILARITY_THRESHOLD, MAX_CONTEXT_DOCUMENTS

logger = get_logger(__name__)

class VectorSearch:
    """Vector similarity search for document retrieval."""

    def __init__(self,
                 vector_store: VectorStore = None,
                 embedding_generator: EmbeddingGenerator = None):
        """
        Initialize the vector search.

        Args:
            vector_store: Vector store for document embeddings
            embedding_generator: Embedding generator for queries
        """
        self.vector_store = vector_store or VectorStore()
        self.embedding_generator = embedding_generator or EmbeddingGenerator()

    def search(self, query: str, top_k: int = MAX_CONTEXT_DOCUMENTS, prioritize_files: List[str] = None) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query.

        Args:
            query: Query text
            top_k: Number of results to return
            prioritize_files: List of filenames to prioritize in search results

        Returns:
            List of document dictionaries with similarity scores
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_generator.generate_query_embedding(query)

            # Adjust top_k to fetch more results initially, then filter
            # This helps ensure we get enough results after filtering
            search_top_k = min(top_k * 2, 20)  # Get more results than needed, but cap at 20

            # Search vector store
            results = self.vector_store.search(query_embedding, top_k=search_top_k)

            # Apply adaptive threshold based on result distribution
            if results:
                # Get the highest score
                max_score = max(doc["score"] for doc in results)

                # Use a dynamic threshold that's either the configured minimum or
                # a percentage of the highest score, whichever is higher
                dynamic_threshold = max(SIMILARITY_THRESHOLD, max_score * 0.7)

                # Filter by dynamic threshold
                filtered_results = [
                    doc for doc in results
                    if doc["score"] > dynamic_threshold
                ]

                # If we have too few results, fall back to the static threshold
                if len(filtered_results) < 2 and len(results) > 2:
                    filtered_results = [
                        doc for doc in results
                        if doc["score"] > SIMILARITY_THRESHOLD
                    ]
            else:
                filtered_results = []

            # If prioritize_files is provided, boost scores for those files
            if prioritize_files and filtered_results:
                # Create a new list with boosted scores for prioritized files
                boosted_results = []

                for doc in filtered_results:
                    # Check if the document is from a prioritized file
                    source_file = doc.get("source_file", "")

                    # Boost score if the file is in the prioritized list
                    if any(pf in source_file for pf in prioritize_files):
                        # Boost the score by 20%
                        doc["score"] = min(1.0, doc["score"] * 1.2)
                        doc["prioritized"] = True
                        logger.info(f"Boosted score for document from prioritized file: {source_file}")
                    else:
                        doc["prioritized"] = False

                    boosted_results.append(doc)

                # Re-sort by score after boosting
                boosted_results.sort(key=lambda x: x["score"], reverse=True)
                filtered_results = boosted_results

            # Limit to requested top_k
            filtered_results = filtered_results[:top_k]

            logger.info(f"Found {len(filtered_results)} relevant documents for query (from {len(results)} initial results)")
            if filtered_results:
                score_range = f"scores: {filtered_results[0]['score']:.3f} to {filtered_results[-1]['score']:.3f}"
                logger.info(f"Relevance {score_range}")

                # Log prioritized files
                if prioritize_files:
                    prioritized_count = sum(1 for doc in filtered_results if doc.get("prioritized", False))
                    logger.info(f"{prioritized_count} of {len(filtered_results)} results are from prioritized files")

            return filtered_results

        except Exception as e:
            logger.error(f"Error searching for documents: {e}")
            return []
