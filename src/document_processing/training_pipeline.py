"""
End-to-end training pipeline for document processing with production-grade enhancements.
"""
import os
import glob
import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import multiprocessing
import traceback

from ..utils.logger import get_logger
from ..config import RAW_DIR, PROCESSED_DIR
from ..database.models import DocumentModel
from ..database.vector_store import VectorStore
from .file_processor import FileProcessor
from .text_chunker import TextChunker
from .embedding_generator import EmbeddingGenerator

logger = get_logger(__name__)

class DocumentProcessingException(Exception):
    """Custom exception for document processing errors."""
    pass

class TrainingPipeline:
    """End-to-end pipeline for processing documents and generating embeddings."""

    def __init__(self,
                 chunk_size: int = 1200,
                 chunk_overlap: int = 300,
                 max_workers: Optional[int] = None,
                 batch_size: int = 10):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        available_cores = multiprocessing.cpu_count()
        self.max_workers = max_workers or max(1, available_cores // 2)
        self.batch_size = batch_size

        logger.info(f"Using {self.max_workers} worker threads (out of {available_cores} available cores)")

        self.chunker = TextChunker(chunk_size=self.chunk_size, chunk_overlap=self.chunk_overlap)
        self.embedding_generator = EmbeddingGenerator()
        self.doc_model = DocumentModel()
        self.vector_store = VectorStore()

    def _is_valid_file(self, file_path: Path) -> bool:
        if file_path.stat().st_size == 0:
            logger.warning(f"Skipping empty file: {file_path.name}")
            return False
        return True

    def _write_processed_marker(self, file_path: Path, total_chunks: int, total_embeddings: int):
        processed_path = PROCESSED_DIR / file_path.name
        os.makedirs(PROCESSED_DIR, exist_ok=True)
        with open(processed_path, 'w') as f:
            f.write(f"Processed: {file_path}\n")
            f.write(f"Chunks: {total_chunks}\n")
            f.write(f"Embeddings: {total_embeddings}\n")
            f.write(f"Processed on: {datetime.datetime.now().isoformat()}\n")
            f.write(f"Chunk size: {self.chunk_size}\n")
            f.write(f"Chunk overlap: {self.chunk_overlap}\n")

    def process_directory(self, directory: Path = RAW_DIR, force_reprocess: bool = False) -> int:
        try:
            os.makedirs(directory, exist_ok=True)
            os.makedirs(PROCESSED_DIR, exist_ok=True)
            supported_extensions = ['.pdf', '.docx', '.txt', '.md']
            files = [Path(file) for ext in supported_extensions for file in glob.glob(str(directory / f"*{ext}"))]
            if not files:
                logger.warning(f"No supported files found in {directory}")
                return 0

            files_to_process = []
            for file in files:
                if not self._is_valid_file(file):
                    continue
                processed_marker = PROCESSED_DIR / file.name
                if not force_reprocess and processed_marker.exists():
                    if os.path.getmtime(file) <= os.path.getmtime(processed_marker):
                        logger.info(f"Skipping {file.name} - already processed")
                        continue
                files_to_process.append(file)

            if not files_to_process:
                logger.info(f"No files need processing in {directory}")
                return 0

            processed_count = 0
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {executor.submit(self.process_file, file): file for file in files_to_process}
                for future in tqdm(as_completed(futures), total=len(futures), desc="Processing files"):
                    file = futures[future]
                    try:
                        result = future.result()
                        processed_count += result
                    except Exception as e:
                        logger.error(f"Failed to process {file.name}: {e}\n{traceback.format_exc()}")

            logger.info(f"Successfully processed {processed_count} documents")
            return processed_count

        except Exception as e:
            logger.error(f"Error in process_directory: {e}\n{traceback.format_exc()}")
            return 0

    def process_file(self, file_path: Path) -> int:
        if not self._is_valid_file(file_path):
            return 0

        try:
            document = FileProcessor.process_file(file_path)
            document_chunks = self.chunker.chunk_document(document)

            total_chunks = len(document_chunks)
            processed_chunks = 0
            total_embeddings = 0

            for i in range(0, total_chunks, self.batch_size):
                batch = document_chunks[i:i+self.batch_size]
                chunk_ids = []

                for chunk in batch:
                    try:
                        chunk_id = self.doc_model.save_document(
                            title=chunk["title"],
                            content=chunk["content"],
                            source_file=chunk["source_file"],
                            chunk_index=chunk["chunk_index"]
                        )
                        chunk["id"] = chunk_id
                        chunk_ids.append(chunk_id)
                    except Exception as db_error:
                        logger.warning(f"Database write failed for chunk: {db_error}")
                        continue

                if not chunk_ids:
                    continue

                try:
                    embedding_result = self.embedding_generator.generate_embeddings(batch)
                    embeddings = embedding_result["embeddings"]
                    self.vector_store.add_documents(batch, embeddings)
                    total_embeddings += len(embeddings)
                    processed_chunks += len(batch)
                except Exception as embed_error:
                    logger.error(f"Embedding error: {embed_error}\n{traceback.format_exc()}")

            self._write_processed_marker(file_path, total_chunks, total_embeddings)
            logger.info(f"Processed {file_path.name}: {total_chunks} chunks, {total_embeddings} embeddings")
            return total_chunks

        except Exception as e:
            logger.error(f"Unhandled error in process_file: {e}\n{traceback.format_exc()}")
            return 0

    def process_hr_files(self, hr_files_dir: Path, force_reprocess: bool = False) -> int:
        if not os.path.exists(hr_files_dir):
            logger.error(f"HR files directory not found: {hr_files_dir}")
            return 0
        return self.process_directory(directory=hr_files_dir, force_reprocess=force_reprocess)

if __name__ == "__main__":
    pipeline = TrainingPipeline()
    count = pipeline.process_directory(directory=RAW_DIR, force_reprocess=True)
    print(f"Processed {count} documents")
