"""
Generate embeddings for document chunks using Hugging Face Transformers.
"""
import os
import numpy as np
from typing import List, Dict, Any
from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModel

from ..utils.logger import get_logger
from ..config import EMBEDDING_MODEL_NAME, EMBEDDINGS_DIR, VECTOR_DIMENSION
from ..core.resources import GlobalResources

logger = get_logger(__name__)

class EmbeddingGenerator:
    """Generate embeddings for document chunks using Hugging Face Transformers."""

    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self.device = torch.device("cpu")  # ⛔ Enforce CPU-only mode

        # Load tokenizer and model using GlobalResources
        self.tokenizer = GlobalResources.get_embedding_tokenizer()
        self.model = GlobalResources.get_embedding_model().to(self.device)
        self.model.eval()

    def _mean_pooling(self, model_output, attention_mask):
        """
        Mean pooling strategy to generate sentence embeddings.
        """
        token_embeddings = model_output[0]  # last hidden state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return (token_embeddings * input_mask_expanded).sum(1) / input_mask_expanded.sum(1)

    def generate_embeddings(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        texts = [doc["content"] for doc in documents]

        try:
            logger.info(f"Generating embeddings for {len(texts)} documents")

            # Batch control based on average text length
            avg_length = sum(len(t) for t in texts) / max(1, len(texts))
            batch_size = 32 if avg_length < 500 else 16 if avg_length < 1000 else 8

            logger.info(f"Using batch size {batch_size} for average length {avg_length:.1f}")
            all_embeddings = []

            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                encoded_input = self.tokenizer(batch_texts, padding=True, truncation=True, return_tensors='pt').to(self.device)

                with torch.no_grad():
                    model_output = self.model(**encoded_input)
                    embeddings = self._mean_pooling(model_output, encoded_input['attention_mask'])

                embeddings_np = embeddings.cpu().numpy()
                all_embeddings.append(embeddings_np)

            final_embeddings = np.vstack(all_embeddings)

            # ✅ Check for correct vector dimension
            if final_embeddings.shape[1] != VECTOR_DIMENSION:
                raise ValueError(f"❌ Embedding dimension mismatch: Expected {VECTOR_DIMENSION}, got {final_embeddings.shape[1]}")

            logger.info(f"Generated {len(final_embeddings)} embeddings with dimension {final_embeddings.shape[1]}")

            return {
                "embeddings": final_embeddings,
                "documents": documents
            }

        except Exception as e:
            logger.error(f"Error generating embeddings: {e}", exc_info=True)
            raise

    def generate_query_embedding(self, query: str) -> np.ndarray:
        try:
            encoded_input = self.tokenizer([query], padding=True, truncation=True, return_tensors='pt').to(self.device)

            with torch.no_grad():
                model_output = self.model(**encoded_input)
                embedding = self._mean_pooling(model_output, encoded_input['attention_mask'])

            embedding_np = embedding[0].cpu().numpy()

            # Graceful fallback if dimension mismatch
            if embedding_np.shape[0] != VECTOR_DIMENSION:
                logger.warning(f"⚠️ Query embedding dimension mismatch: Expected {VECTOR_DIMENSION}, got {embedding_np.shape[0]}")
                return np.zeros(VECTOR_DIMENSION)

            return embedding_np

        except Exception as e:
            logger.error(f"Error generating query embedding: {e}", exc_info=True)
            return np.zeros(VECTOR_DIMENSION)

    def save_embeddings(self, embeddings: np.ndarray, name: str) -> Path:
        os.makedirs(EMBEDDINGS_DIR, exist_ok=True)
        file_path = EMBEDDINGS_DIR / f"{name}.npy"
        np.save(file_path, embeddings)
        logger.info(f"Saved embeddings to {file_path}")
        return file_path
