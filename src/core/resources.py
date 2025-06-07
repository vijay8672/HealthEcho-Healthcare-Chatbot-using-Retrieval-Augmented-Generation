import os
import threading
import warnings
from typing import Optional

import faiss
from transformers import AutoModel, AutoTokenizer

from ..utils.logger import get_logger
from ..config import EMBEDDING_MODEL_NAME, VECTOR_DIMENSION, FAISS_INDEX_PATH

logger = get_logger(__name__)


class GlobalResources:
    """
    Manages global singleton resources: FAISS index, embedding model, tokenizer.
    Thread-safe, production-ready with disk persistence for FAISS.
    """

    _faiss_index: Optional[faiss.Index] = None
    _embedding_model: Optional[AutoModel] = None
    _embedding_tokenizer: Optional[AutoTokenizer] = None
    _lock = threading.Lock()

    @staticmethod
    def get_faiss_index(dimension: int = VECTOR_DIMENSION) -> Optional[faiss.Index]:
        """Get or initialize a singleton FAISS index, with optional disk load."""
        if GlobalResources._faiss_index is None:
            with GlobalResources._lock:
                if GlobalResources._faiss_index is None:
                    try:
                        logger.info("[INIT] Loading FAISS index...")

                        # Try AVX2 version first
                        try:
                            import faiss.swigfaiss_avx2  # noqa: F401
                            logger.info("[INIT] FAISS AVX2 support available.")
                        except ImportError:
                            logger.info("[INIT] FAISS AVX2 not available. Using standard FAISS.")

                        if FAISS_INDEX_PATH and os.path.exists(FAISS_INDEX_PATH):
                            index = faiss.read_index(FAISS_INDEX_PATH)
                            logger.info(f"[INIT] Loaded FAISS index from disk: {FAISS_INDEX_PATH}")
                        else:
                            index = faiss.IndexFlatL2(dimension)
                            logger.warning("[INIT] No FAISS index file found. Initialized new IndexFlatL2.")

                        GlobalResources._faiss_index = index

                    except Exception as e:
                        logger.exception(f"[ERROR] Failed to initialize FAISS index: {e}")

        return GlobalResources._faiss_index

    @staticmethod
    def save_faiss_index():
        """Save FAISS index to disk if initialized."""
        if GlobalResources._faiss_index and FAISS_INDEX_PATH:
            try:
                faiss.write_index(GlobalResources._faiss_index, FAISS_INDEX_PATH)
                logger.info(f"[SAVE] FAISS index saved to {FAISS_INDEX_PATH}")
            except Exception as e:
                logger.error(f"[SAVE] Failed to save FAISS index: {e}")

    @staticmethod
    def get_embedding_model() -> Optional[AutoModel]:
        """Get or initialize Hugging Face embedding model."""
        if GlobalResources._embedding_model is None:
            with GlobalResources._lock:
                if GlobalResources._embedding_model is None:
                    try:
                        logger.info(f"[INIT] Loading embedding model: {EMBEDDING_MODEL_NAME}")
                        model = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
                        model.eval()
                        GlobalResources._embedding_model = model
                        logger.info("[INIT] Model loaded successfully.")
                    except Exception as e:
                        logger.exception(f"[ERROR] Failed to load model {EMBEDDING_MODEL_NAME}: {e}")

        return GlobalResources._embedding_model

    @staticmethod
    def get_embedding_tokenizer() -> Optional[AutoTokenizer]:
        """Get or initialize tokenizer."""
        if GlobalResources._embedding_tokenizer is None:
            with GlobalResources._lock:
                if GlobalResources._embedding_tokenizer is None:
                    try:
                        logger.info(f"[INIT] Loading tokenizer: {EMBEDDING_MODEL_NAME}")
                        tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
                        GlobalResources._embedding_tokenizer = tokenizer
                        logger.info("[INIT] Tokenizer loaded successfully.")
                    except Exception as e:
                        logger.exception(f"[ERROR] Failed to load tokenizer {EMBEDDING_MODEL_NAME}: {e}")

        return GlobalResources._embedding_tokenizer

    @staticmethod
    def warm_up_resources():
        """Preload all resources to avoid cold starts."""
        logger.info("[INIT] Warming up global resources...")
        GlobalResources.get_embedding_model()
        GlobalResources.get_embedding_tokenizer()
        GlobalResources.get_faiss_index()
        logger.info("[INIT] Warm-up complete.")
