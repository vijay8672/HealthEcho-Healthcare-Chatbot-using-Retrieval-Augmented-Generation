import threading
import warnings
from typing import Optional

import faiss
from transformers import AutoModel, AutoTokenizer

from ..utils.logger import get_logger
from ..config import EMBEDDING_MODEL_NAME, VECTOR_DIMENSION

logger = get_logger(__name__)

class GlobalResources:
    """
    Manages global singleton resources like the FAISS index and embedding model/tokenizer.
    Ensures resources are initialized only once and reused across the application.
    """

    _faiss_index: Optional[object] = None  # FAISS index
    _embedding_model: Optional[AutoModel] = None  # Hugging Face model
    _embedding_tokenizer: Optional[AutoTokenizer] = None  # Hugging Face tokenizer
    _lock = threading.Lock()

    @staticmethod
    def get_faiss_index(dimension: int = VECTOR_DIMENSION) -> Optional[object]:
        """Gets the singleton FAISS index instance, initializing it if necessary."""
        if GlobalResources._faiss_index is None:
            with GlobalResources._lock:
                if GlobalResources._faiss_index is None:
                    logger.info("[INIT] Initializing FAISS index...")
                    try:
                        faiss_module = None
                        with warnings.catch_warnings():
                            warnings.simplefilter("ignore")
                            import faiss

                            try:
                                import faiss.swigfaiss_avx2
                                logger.info("[INIT] Loaded FAISS with AVX2 support.")
                            except ImportError:
                                logger.info("[INIT] AVX2 not available, using standard FAISS.")

                            faiss_module = faiss

                        if faiss_module is None:
                            logger.error("[INIT] FAISS module import failed.")
                            return None

                        index_type = "L2"
                        if index_type == "L2":
                            index = faiss_module.IndexFlatL2(dimension)
                        elif index_type == "IP":
                            index = faiss_module.IndexFlatIP(dimension)
                        else:
                            logger.error(f"[INIT] Unsupported FAISS index type: {index_type}")
                            return None

                        GlobalResources._faiss_index = index
                        logger.info("[INIT] FAISS index initialized successfully.")

                    except Exception as e:
                        logger.error(f"[INIT] Error during FAISS index initialization: {e}")
                        GlobalResources._faiss_index = None

        else:
            logger.debug("[INIT] Reusing existing FAISS index instance.")

        return GlobalResources._faiss_index

    @staticmethod
    def get_embedding_model() -> Optional[AutoModel]:
        """Gets the singleton Hugging Face embedding model instance."""
        if GlobalResources._embedding_model is None:
            with GlobalResources._lock:
                if GlobalResources._embedding_model is None:
                    logger.info(f"[INIT] Loading Hugging Face model: {EMBEDDING_MODEL_NAME}")
                    try:
                        model = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
                        model.eval()
                        GlobalResources._embedding_model = model
                        logger.info("[INIT] Embedding model loaded successfully.")
                    except Exception as e:
                        logger.error(f"[INIT] Failed to load model {EMBEDDING_MODEL_NAME}: {e}")
                        GlobalResources._embedding_model = None

        else:
            logger.debug(f"[INIT] Reusing existing model: {EMBEDDING_MODEL_NAME}")

        return GlobalResources._embedding_model

    @staticmethod
    def get_embedding_tokenizer() -> Optional[AutoTokenizer]:
        """Gets the singleton Hugging Face tokenizer instance."""
        if GlobalResources._embedding_tokenizer is None:
            with GlobalResources._lock:
                if GlobalResources._embedding_tokenizer is None:
                    logger.info(f"[INIT] Loading tokenizer for: {EMBEDDING_MODEL_NAME}")
                    try:
                        tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
                        GlobalResources._embedding_tokenizer = tokenizer
                        logger.info("[INIT] Tokenizer loaded successfully.")
                    except Exception as e:
                        logger.error(f"[INIT] Failed to load tokenizer {EMBEDDING_MODEL_NAME}: {e}")
                        GlobalResources._embedding_tokenizer = None

        else:
            logger.debug(f"[INIT] Reusing existing tokenizer: {EMBEDDING_MODEL_NAME}")

        return GlobalResources._embedding_tokenizer

    @staticmethod
    def warm_up_resources():
        """
        Placeholder: Warm up model/index if needed to reduce cold start latency.
        """
        logger.info("[INIT] Starting warm-up (placeholder).")
        # Example: encode dummy input or pre-load index file
        pass
