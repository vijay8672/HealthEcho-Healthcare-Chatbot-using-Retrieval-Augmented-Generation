"""
Generate embeddings for document chunks.
"""
import os
import numpy as np
from typing import List, Dict, Any
from pathlib import Path
from sentence_transformers import SentenceTransformer

from ..utils.logger import get_logger
from ..config import EMBEDDING_MODEL_NAME, EMBEDDINGS_DIR

logger = get_logger(__name__)

class EmbeddingGenerator:
    """Generate embeddings for document chunks using Sentence Transformers."""

    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME):
        """
        Initialize the embedding generator.

        Args:
            model_name: Name of the Sentence Transformers model to use
        """
        self.model_name = model_name
        self.model = None  # Lazy loading

    def _load_model(self):
        """Load the embedding model."""
        if self.model is None:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Embedding model loaded with dimension: {self.model.get_sentence_embedding_dimension()}")

    def generate_embeddings(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate embeddings for a list of document chunks.

        Args:
            documents: List of document chunk dictionaries

        Returns:
            Dictionary with document IDs and their corresponding embeddings
        """
        self._load_model()

        # Extract text from documents
        texts = [doc["content"] for doc in documents]

        # Generate embeddings
        try:
            logger.info(f"Generating embeddings for {len(texts)} documents")

            # Use CPU-optimized settings
            # Set batch size based on document length to avoid OOM errors
            avg_length = sum(len(text) for text in texts) / max(1, len(texts))

            # Adjust batch size based on average text length
            # Shorter texts can use larger batches
            if avg_length < 500:
                batch_size = 32
            elif avg_length < 1000:
                batch_size = 16
            else:
                batch_size = 8

            logger.info(f"Using batch size {batch_size} for texts with average length {avg_length:.1f}")

            # Generate embeddings with optimized batch size
            embeddings = self.model.encode(
                texts,
                show_progress_bar=True,
                batch_size=batch_size,
                convert_to_numpy=True,
                normalize_embeddings=True  # Pre-normalize for cosine similarity
            )

            # Create mapping of document index to embedding
            result = {
                "embeddings": embeddings,
                "documents": documents
            }

            logger.info(f"Generated {len(embeddings)} embeddings with dimension {embeddings.shape[1]}")
            return result

        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise

    def generate_query_embedding(self, query: str) -> np.ndarray:
        """
        Generate embedding for a query.

        Args:
            query: Query text

        Returns:
            Query embedding as numpy array
        """
        self._load_model()

        try:
            # Generate embedding with normalization for cosine similarity
            embedding = self.model.encode(
                query,
                convert_to_numpy=True,
                normalize_embeddings=True  # Pre-normalize for cosine similarity
            )
            return embedding

        except Exception as e:
            logger.error(f"Error generating query embedding: {e}")
            raise

    def save_embeddings(self, embeddings: np.ndarray, name: str) -> Path:
        """
        Save embeddings to disk.

        Args:
            embeddings: Numpy array of embeddings
            name: Name for the embeddings file

        Returns:
            Path to the saved embeddings file
        """
        # Create directory if it doesn't exist
        os.makedirs(EMBEDDINGS_DIR, exist_ok=True)

        # Create file path
        file_path = EMBEDDINGS_DIR / f"{name}.npy"

        # Save embeddings
        np.save(file_path, embeddings)

        logger.info(f"Saved embeddings to {file_path}")
        return file_path
