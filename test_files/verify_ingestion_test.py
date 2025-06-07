"""
Verify document ingestion pipeline and vector store state.
"""
import os
from pathlib import Path

from src.document_processing.training_pipeline import TrainingPipeline
from src.database.vector_store import VectorStore
from src.config import RAW_DIR, DATA_DIR
from src.utils.logger import get_logger

logger = get_logger(__name__)

def verify_vector_store():
    """Verify vector store state."""
    vector_store = VectorStore()
    
    # Check FAISS index
    if vector_store.index is None:
        logger.error("❌ FAISS index not initialized")
        return False
        
    # Check document count
    if len(vector_store.documents) == 0:
        logger.error("❌ No documents in vector store")
        return False
        
    # Check vector count
    if len(vector_store.vectors) == 0:
        logger.error("❌ No vectors in vector store")
        return False
        
    # Check FAISS index size
    if vector_store.index.ntotal == 0:
        logger.error("❌ FAISS index is empty")
        return False
        
    # Verify counts match
    if len(vector_store.documents) != len(vector_store.vectors):
        logger.error(f"❌ Document count ({len(vector_store.documents)}) doesn't match vector count ({len(vector_store.vectors)})")
        return False
        
    if vector_store.index.ntotal != len(vector_store.vectors):
        logger.error(f"❌ FAISS index size ({vector_store.index.ntotal}) doesn't match vector count ({len(vector_store.vectors)})")
        return False
        
    logger.info(f"✅ Vector store verification passed:")
    logger.info(f"   - Documents: {len(vector_store.documents)}")
    logger.info(f"   - Vectors: {len(vector_store.vectors)}")
    logger.info(f"   - FAISS index size: {vector_store.index.ntotal}")
    return True

def verify_document_ingestion():
    """Verify document ingestion pipeline."""
    # Check raw directory
    if not RAW_DIR.exists():
        logger.error(f"❌ Raw directory not found: {RAW_DIR}")
        return False
        
    # Count raw files
    raw_files = list(RAW_DIR.glob("*.*"))
    if not raw_files:
        logger.error(f"❌ No files found in {RAW_DIR}")
        return False
        
    logger.info(f"Found {len(raw_files)} files in {RAW_DIR}")
    
    # Process files
    pipeline = TrainingPipeline()
    processed_count = pipeline.process_directory(directory=RAW_DIR, force_reprocess=True)
    
    if processed_count == 0:
        logger.error("❌ No documents were processed")
        return False
        
    logger.info(f"✅ Processed {processed_count} documents")
    
    # Verify vector store after processing
    return verify_vector_store()

def main():
    """Run verification checks."""
    logger.info("Starting document ingestion verification")
    
    # Create necessary directories
    for directory in [RAW_DIR, DATA_DIR]:
        directory.mkdir(parents=True, exist_ok=True)
    
    # Run verification
    if verify_document_ingestion():
        logger.info("✅ Document ingestion pipeline verification passed")
    else:
        logger.error("❌ Document ingestion pipeline verification failed")

if __name__ == "__main__":
    main() 