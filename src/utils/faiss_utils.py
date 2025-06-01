"""
Utility functions for FAISS initialization and configuration.
"""
import os
import logging
from typing import Optional
import warnings

# Configure logging
logger = logging.getLogger(__name__)

def initialize_faiss() -> Optional[object]:
    """
    Initialize FAISS with proper error handling for AVX2 module.
    
    Returns:
        FAISS module or None if initialization fails
    """
    try:
        # Suppress warnings during import
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            
            # Try importing FAISS
            import faiss
            
            # Check if we're on a CPU-only system
            if not hasattr(faiss, 'gpu'):
                logger.info("Running on CPU-only system, using standard FAISS")
                return faiss
            
            # Try to import AVX2 module
            try:
                import faiss.swigfaiss_avx2
                logger.info("Successfully loaded FAISS with AVX2 support")
                return faiss
            except ImportError:
                logger.info("AVX2 module not available, using standard FAISS")
                return faiss
                
    except ImportError as e:
        logger.warning(f"Failed to import FAISS: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during FAISS initialization: {e}")
        return None

def get_faiss_index(dim: int, index_type: str = "L2") -> Optional[object]:
    """
    Create a FAISS index with proper error handling.
    
    Args:
        dim: Dimension of the vectors
        index_type: Type of index to create ("L2" or "IP")
        
    Returns:
        FAISS index or None if creation fails
    """
    try:
        faiss = initialize_faiss()
        if faiss is None:
            return None
            
        # Create index based on type
        if index_type == "L2":
            index = faiss.IndexFlatL2(dim)
        elif index_type == "IP":
            index = faiss.IndexFlatIP(dim)
        else:
            logger.error(f"Unsupported index type: {index_type}")
            return None
            
        return index
        
    except Exception as e:
        logger.error(f"Error creating FAISS index: {e}")
        return None 