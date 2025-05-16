"""
Vector database for storing and retrieving document embeddings.
"""
import os
import numpy as np
import faiss
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path

from ..utils.logger import get_logger
from .models import DocumentModel, VectorIndexModel
from ..config import EMBEDDINGS_DIR, VECTOR_DIMENSION

logger = get_logger(__name__)

class VectorStore:
    """Manages vector storage and retrieval using FAISS."""

    def __init__(self, index_name: str = "default", dimension: int = VECTOR_DIMENSION):
        """
        Initialize the vector store.

        Args:
            index_name: Name of the vector index
            dimension: Dimension of the embedding vectors
        """
        self.index_name = index_name
        self.dimension = dimension
        self.doc_model = DocumentModel()
        self.index_model = VectorIndexModel()
        self.index_path = EMBEDDINGS_DIR / f"{index_name}.index"
        self.id_map_path = EMBEDDINGS_DIR / f"{index_name}_id_map.npy"

        # Load or create the index
        self.index, self.id_map = self._load_or_create_index()

    def _load_or_create_index(self) -> Tuple[faiss.Index, np.ndarray]:
        """Load existing index or create a new one."""
        if os.path.exists(self.index_path):
            try:
                # Load existing index
                index = faiss.read_index(str(self.index_path))
                id_map = np.load(self.id_map_path)
                logger.info(f"Loaded existing index '{self.index_name}' with {index.ntotal} vectors")
                return index, id_map
            except Exception as e:
                logger.error(f"Error loading index: {e}")

        # Create new index - use CPU-optimized index
        # For small datasets, IndexFlatIP is fine
        # For larger datasets, use a more efficient index type
        if os.environ.get('USE_EFFICIENT_INDEX', 'true').lower() == 'true':
            # Create a more CPU-efficient index for larger datasets
            # This uses a quantizer for better memory usage and faster search
            quantizer = faiss.IndexFlatIP(self.dimension)
            index = faiss.IndexIVFFlat(quantizer, self.dimension, 100)  # 100 centroids
            # Need to train the index with some data before using
            # We'll train it when we add the first batch of embeddings
            index.nprobe = 10  # Number of clusters to visit during search (trade-off between speed and accuracy)
        else:
            # Simple index for small datasets
            index = faiss.IndexFlatIP(self.dimension)

        id_map = np.array([], dtype=np.int64)
        logger.info(f"Created new index '{self.index_name}' with dimension {self.dimension}")
        return index, id_map

    def save_index(self):
        """Save the index to disk."""
        try:
            # Create directory if it doesn't exist
            os.makedirs(EMBEDDINGS_DIR, exist_ok=True)

            # Save the index
            faiss.write_index(self.index, str(self.index_path))
            np.save(self.id_map_path, self.id_map)

            # Update metadata
            self.index_model.save_index_metadata(
                index_name=self.index_name,
                dimension=self.dimension,
                num_vectors=self.index.ntotal
            )

            logger.info(f"Saved index '{self.index_name}' with {self.index.ntotal} vectors")
        except Exception as e:
            logger.error(f"Error saving index: {e}")

    def add_embeddings(self, embeddings: np.ndarray, doc_ids: List[int]):
        """
        Add embeddings to the index.

        Args:
            embeddings: Array of embedding vectors (shape: n x dimension)
            doc_ids: List of document IDs corresponding to the embeddings
        """
        if len(embeddings) != len(doc_ids):
            raise ValueError("Number of embeddings must match number of document IDs")

        try:
            # Normalize vectors for cosine similarity
            faiss.normalize_L2(embeddings)

            # Check if we need to train the index (for IVF indexes)
            if isinstance(self.index, faiss.IndexIVFFlat) and not self.index.is_trained:
                logger.info(f"Training index with {len(embeddings)} vectors")
                self.index.train(embeddings)

            # Add to index
            self.index.add(embeddings)

            # Update ID mapping
            self.id_map = np.append(self.id_map, doc_ids)

            # Save updated index
            self.save_index()

            logger.info(f"Added {len(embeddings)} embeddings to index '{self.index_name}'")
        except Exception as e:
            logger.error(f"Error adding embeddings: {e}")

    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for similar vectors.

        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return

        Returns:
            List of document dictionaries with similarity scores
        """
        if self.index.ntotal == 0:
            logger.warning("Index is empty, no results to return")
            return []

        try:
            # Reshape and normalize query vector
            query_embedding = query_embedding.reshape(1, -1).astype(np.float32)
            faiss.normalize_L2(query_embedding)

            # Search index
            similarities, indices = self.index.search(query_embedding, min(top_k, self.index.ntotal))

            # Get document IDs from the mapping
            doc_ids = [int(self.id_map[idx]) for idx in indices[0] if idx >= 0 and idx < len(self.id_map)]

            # Retrieve documents
            results = []
            for i, doc_id in enumerate(doc_ids):
                doc = self.doc_model.get_document(doc_id)
                if doc:
                    results.append({
                        "id": doc_id,
                        "title": doc["title"],
                        "content": doc["content"],
                        "source_file": doc["source_file"],
                        "score": float(similarities[0][i])
                    })

            logger.info(f"Found {len(results)} similar documents for query")
            return results

        except Exception as e:
            logger.error(f"Error searching index: {e}")
            return []
