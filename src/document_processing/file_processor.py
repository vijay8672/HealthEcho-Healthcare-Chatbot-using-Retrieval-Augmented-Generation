"""
Process different file types for document ingestion.
"""
import os
import re
import unicodedata
from typing import Dict, Any
from pathlib import Path

# Handle optional dependencies gracefully
try:
    import docx
except ImportError:
    docx = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import markdown
    from bs4 import BeautifulSoup
    markdown_available = True
except ImportError:
    markdown_available = False

from ..utils.logger import get_logger

logger = get_logger(__name__)

class FileProcessor:
    """Process different file types for text extraction."""

    SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.txt', '.md'}
    MAX_FILE_SIZE_MB = 20

    @staticmethod
    def process_file(file_path: Path) -> Dict[str, Any]:
        """Main interface to process file content and metadata."""
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return FileProcessor._error_doc(file_path, "FILE NOT FOUND")

        if file_path.stat().st_size > FileProcessor.MAX_FILE_SIZE_MB * 1024 * 1024:
            logger.warning(f"File too large: {file_path.name}")
            return FileProcessor._error_doc(file_path, "FILE TOO LARGE")

        file_extension = file_path.suffix.lower()
        file_name = file_path.name
        title = FileProcessor._generate_title(file_name, file_extension)

        handler = FileProcessor._get_handler(file_extension)

        try:
            content = handler(file_path)
            content = unicodedata.normalize('NFKC', content or "").strip()
            if not content:
                content = f"[EMPTY CONTENT: {file_path.name}]"
                logger.warning(f"Empty content extracted from {file_path}")
            elif len(content) < 50:
                logger.warning(f"Very short content extracted from {file_path} ({len(content)} characters)")

            logger.info(f"Processed {file_extension.upper()} file: {file_name} ({len(content)} characters)")
            return {
                "title": title,
                "content": content,
                "source_file": str(file_path),
                "file_type": file_extension.lstrip('.')
            }

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            return FileProcessor._error_doc(file_path, str(e), title)

    @staticmethod
    def _get_handler(extension: str):
        return {
            '.pdf': FileProcessor.extract_from_pdf,
            '.docx': FileProcessor.extract_from_docx,
            '.txt': FileProcessor.extract_from_txt,
            '.md': FileProcessor.extract_from_markdown
        }.get(extension, FileProcessor.extract_from_txt)

    @staticmethod
    def _generate_title(file_name: str, file_extension: str) -> str:
        title = file_name.replace(file_extension, '').replace('-', ' ').replace('_', ' ')
        return re.sub(r'\s+', ' ', title).strip().title()

    @staticmethod
    def _error_doc(file_path: Path, error: str, title: str = None) -> Dict[str, Any]:
        return {
            "title": title or f"Error: {file_path.name}",
            "content": f"[{error}: {file_path.name}]",
            "source_file": str(file_path),
            "file_type": "error"
        }

    @staticmethod
    def extract_from_pdf(file_path: Path) -> str:
        if fitz is None:
            logger.warning("PyMuPDF not installed.")
            return f"[PDF PROCESSING NOT AVAILABLE - Please install PyMuPDF to process {file_path.name}]"

        try:
            with fitz.open(file_path) as pdf:
                text = " ".join(page.get_text() for page in pdf)
            return re.sub(r'\s+', ' ', text)
        except Exception as e:
            logger.error(f"Error reading PDF {file_path}: {e}")
            return f"[ERROR PROCESSING PDF: {e}]"

    @staticmethod
    def extract_from_docx(file_path: Path) -> str:
        if docx is None:
            logger.warning("python-docx not installed.")
            return f"[DOCX PROCESSING NOT AVAILABLE - Please install python-docx to process {file_path.name}]"

        try:
            document = docx.Document(file_path)
            return "\n".join(paragraph.text for paragraph in document.paragraphs)
        except Exception as e:
            logger.error(f"Error reading DOCX {file_path}: {e}")
            return f"[ERROR PROCESSING DOCX: {e}]"

    @staticmethod
    def extract_from_txt(file_path: Path) -> str:
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        try:
            for enc in encodings:
                try:
                    with open(file_path, 'r', encoding=enc) as f:
                        logger.info(f"Successfully read {file_path} with {enc} encoding")
                        return f.read()
                except UnicodeDecodeError:
                    continue
            with open(file_path, 'rb') as f:
                return f.read().decode('utf-8', errors='replace')
        except Exception as e:
            logger.error(f"Error reading TXT {file_path}: {e}")
            return f"[ERROR PROCESSING TEXT FILE: {e}]"

    @staticmethod
    def extract_from_markdown(file_path: Path) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                md_text = f.read()

            if not markdown_available:
                logger.warning("Markdown/BeautifulSoup not installed. Returning raw markdown.")
                return md_text

            html = markdown.markdown(md_text)
            soup = BeautifulSoup(html, 'html.parser')
            return soup.get_text()
        except Exception as e:
            logger.error(f"Error reading Markdown {file_path}: {e}")
            return f"[ERROR PROCESSING MARKDOWN: {e}]"