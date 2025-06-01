"""
End-to-end training pipeline for document processing.
"""
import os
import glob
import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

from ..utils.logger import get_logger
from ..config import RAW_DIR, PROCESSED_DIR
from ..database.models import DocumentModel
from ..database.vector_store import VectorStore
from .file_processor import FileProcessor
from .text_chunker import TextChunker
from .embedding_generator import EmbeddingGenerator

logger = get_logger(__name__)

class TrainingPipeline:
    """End-to-end pipeline for processing documents and generating embeddings."""

    def __init__(self,
                 chunk_size: int = 500,
                 chunk_overlap: int = 100,
                 max_workers: int = 2):  # Reduced default workers to be more CPU-friendly
        """
        Initialize the training pipeline.

        Args:
            chunk_size: Size of document chunks
            chunk_overlap: Overlap between chunks
            max_workers: Maximum number of worker threads for parallel processing
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Adjust max_workers based on available CPU cores
        import multiprocessing
        available_cores = multiprocessing.cpu_count()
        # Use at most half of available cores to avoid overloading the CPU
        self.max_workers = min(max_workers, max(1, available_cores // 2))

        logger.info(f"Using {self.max_workers} worker threads (out of {available_cores} available cores)")

        # Initialize components
        self.chunker = TextChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.embedding_generator = EmbeddingGenerator()
        self.doc_model = DocumentModel()
        self.vector_store = VectorStore()

    def process_directory(self, directory: Path = RAW_DIR, force_reprocess: bool = False) -> int:
        """
        Process all supported files in a directory.

        Args:
            directory: Directory containing files to process
            force_reprocess: Whether to force reprocessing of all files

        Returns:
            Number of documents processed
        """
        # Create directory if it doesn't exist
        os.makedirs(directory, exist_ok=True)
        os.makedirs(PROCESSED_DIR, exist_ok=True)

        # Get all supported files
        supported_extensions = ['.pdf', '.docx', '.txt', '.md']
        files = []
        for ext in supported_extensions:
            files.extend(glob.glob(str(directory / f"*{ext}")))

        if not files:
            logger.warning(f"No supported files found in {directory}")
            return 0

        # Filter out files that have already been processed (unless force_reprocess is True)
        if not force_reprocess:
            files_to_process = []
            for file in files:
                file_path = Path(file)
                processed_marker = PROCESSED_DIR / file_path.name

                # Check if the file has been processed before
                if processed_marker.exists():
                    # Check if the file has been modified since last processing
                    file_mtime = os.path.getmtime(file)
                    marker_mtime = os.path.getmtime(processed_marker)

                    if file_mtime <= marker_mtime:
                        logger.info(f"Skipping {file_path.name} - already processed and not modified")
                        continue

                    logger.info(f"File {file_path.name} has been modified since last processing")

                files_to_process.append(file)
        else:
            files_to_process = files

        if not files_to_process:
            logger.info(f"No files need processing in {directory}")
            return 0

        logger.info(f"Found {len(files_to_process)} files to process in {directory} (out of {len(files)} total files)")

        # Process files in parallel
        processed_count = 0
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = [executor.submit(self.process_file, Path(file)) for file in files_to_process]
            for future in futures:
                try:
                    result = future.result()
                    processed_count += result
                except Exception as e:
                    logger.error(f"Error processing file: {e}", exc_info=True)

        logger.info(f"Processed {processed_count} documents")
        return processed_count

    def process_file(self, file_path: Path) -> int:
        """
        Process a single file.

        Args:
            file_path: Path to the file

        Returns:
            Number of document chunks created
        """
        try:
            # Extract text from file
            logger.info(f"Processing file: {file_path}")
            document = FileProcessor.process_file(file_path)
            logger.info(f"Extracted {len(document['content'])} characters from {file_path}")

            # Split into chunks
            document_chunks = self.chunker.chunk_document(document)
            logger.info(f"Split {file_path} into {len(document_chunks)} chunks")

            # Process in smaller batches to reduce memory usage
            batch_size = 10  # Process 10 chunks at a time
            total_chunks = len(document_chunks)
            processed_chunks = 0
            total_embeddings = 0

            for i in range(0, total_chunks, batch_size):
                batch_end = min(i + batch_size, total_chunks)
                current_batch = document_chunks[i:batch_end]
                logger.info(f"Processing batch {i//batch_size + 1}/{(total_chunks + batch_size - 1)//batch_size}")

                # Save chunks to database
                chunk_ids = []
                for chunk in current_batch:
                    chunk_id = self.doc_model.save_document(
                        title=chunk["title"],
                        content=chunk["content"],
                        source_file=chunk["source_file"],
                        chunk_index=chunk["chunk_index"]
                    )
                    chunk["id"] = chunk_id
                    chunk_ids.append(chunk_id)
                logger.info(f"Saved {len(chunk_ids)} chunks to database")

                # Generate embeddings for this batch
                embedding_result = self.embedding_generator.generate_embeddings(current_batch)
                embeddings = embedding_result["embeddings"]
                total_embeddings += len(embeddings)
                logger.info(f"Generated {len(embeddings)} embeddings with dimension {embeddings.shape[1]}")

                # Add embeddings to vector store
                self.vector_store.add_documents(current_batch, embeddings)
                logger.info(f"Added {len(current_batch)} documents to vector store")
                logger.info(f"Current FAISS index size: {self.vector_store.index.ntotal} vectors")

                processed_chunks += len(current_batch)
                logger.info(f"Processed batch {i//batch_size + 1}/{(total_chunks + batch_size - 1)//batch_size}: "
                           f"{processed_chunks}/{total_chunks} chunks")

            # Save processed file marker
            processed_path = PROCESSED_DIR / file_path.name
            os.makedirs(PROCESSED_DIR, exist_ok=True)

            # Create a marker file
            with open(processed_path, 'w') as f:
                f.write(f"Processed: {file_path}\n")
                f.write(f"Chunks: {total_chunks}\n")
                f.write(f"Embeddings: {total_embeddings}\n")
                f.write(f"Processed on: {datetime.datetime.now().isoformat()}\n")

            logger.info(f"Successfully processed {file_path} into {total_chunks} chunks with {total_embeddings} embeddings")
            logger.info(f"Final FAISS index size: {self.vector_store.index.ntotal} vectors")
            return total_chunks

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}", exc_info=True)
            return 0

    def process_hr_files(self, hr_files_dir: Path, force_reprocess: bool = False) -> int:
        """
        Process HR files from a specific directory.

        Args:
            hr_files_dir: Directory containing HR files
            force_reprocess: Whether to force reprocessing of all files

        Returns:
            Number of documents processed
        """
        if not os.path.exists(hr_files_dir):
            logger.error(f"HR files directory not found: {hr_files_dir}")
            return 0

        return self.process_directory(directory=hr_files_dir, force_reprocess=force_reprocess)

if __name__ == "__main__":
    # Initialize the training pipeline
    pipeline = TrainingPipeline()
    
    # Process all files in the raw directory, forcing reprocess
    processed_count = pipeline.process_directory(directory=RAW_DIR, force_reprocess=True)
    print(f"Processed {processed_count} documents")
