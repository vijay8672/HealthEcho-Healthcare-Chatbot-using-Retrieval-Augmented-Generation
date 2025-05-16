"""
Process different file types for document ingestion.
"""
import os
import re
from typing import List, Dict, Any, Optional
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

    @staticmethod
    def process_file(file_path: Path) -> Dict[str, Any]:
        """
        Process a file and extract its text content.

        Args:
            file_path: Path to the file

        Returns:
            Dictionary with file metadata and content
        """
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            # Return a minimal document with error message instead of raising an exception
            return {
                "title": f"Missing File: {file_path.name}",
                "content": f"[FILE NOT FOUND: {file_path}]",
                "source_file": str(file_path),
                "file_type": "error"
            }

        file_extension = file_path.suffix.lower()
        file_name = file_path.name

        # Create title from filename
        title = file_name.replace(file_extension, '').replace('-', ' ').replace('_', ' ')
        title = re.sub(r'\s+', ' ', title).strip().title()

        try:
            # Process based on file extension
            if file_extension == '.pdf':
                content = FileProcessor.extract_from_pdf(file_path)
            elif file_extension == '.docx':
                content = FileProcessor.extract_from_docx(file_path)
            elif file_extension == '.txt':
                content = FileProcessor.extract_from_txt(file_path)
            elif file_extension == '.md':
                content = FileProcessor.extract_from_markdown(file_path)
            else:
                logger.warning(f"Unsupported file type: {file_extension}, treating as text")
                # Try to process as text anyway
                content = FileProcessor.extract_from_txt(file_path)

            # Check if we got any content
            if not content or len(content.strip()) == 0:
                content = f"[EMPTY CONTENT: {file_path.name}]"
                logger.warning(f"Empty content extracted from {file_path}")

            logger.info(f"Processed file: {file_name}, extracted {len(content)} characters")

            return {
                "title": title,
                "content": content,
                "source_file": str(file_path),
                "file_type": file_extension[1:] if file_extension.startswith('.') else file_extension
            }

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            # Return a document with error message instead of raising an exception
            return {
                "title": f"Error Processing: {title}",
                "content": f"[ERROR PROCESSING FILE: {file_path.name}] - {str(e)}",
                "source_file": str(file_path),
                "file_type": "error"
            }

    @staticmethod
    def extract_from_pdf(file_path: Path) -> str:
        """Extract text from a PDF file."""
        if fitz is None:
            logger.warning("PyMuPDF (fitz) module not installed. Cannot process PDF files.")
            return f"[PDF PROCESSING NOT AVAILABLE - Please install PyMuPDF to process {file_path.name}]"

        text = ""
        try:
            # Open the PDF
            with fitz.open(file_path) as pdf:
                # Iterate through pages
                for page in pdf:
                    text += page.get_text()

            # Clean up text
            text = re.sub(r'\s+', ' ', text).strip()
            return text

        except Exception as e:
            logger.error(f"Error extracting text from PDF {file_path}: {e}")
            # Return a fallback message instead of raising an exception
            return f"[ERROR PROCESSING PDF: {str(e)}]"

    @staticmethod
    def extract_from_docx(file_path: Path) -> str:
        """Extract text from a DOCX file."""
        if docx is None:
            logger.warning("python-docx module not installed. Cannot process DOCX files.")
            return f"[DOCX PROCESSING NOT AVAILABLE - Please install python-docx to process {file_path.name}]"

        try:
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text

        except Exception as e:
            logger.error(f"Error extracting text from DOCX {file_path}: {e}")
            # Return a fallback message instead of raising an exception
            return f"[ERROR PROCESSING DOCX: {str(e)}]"

    @staticmethod
    def extract_from_txt(file_path: Path) -> str:
        """Extract text from a TXT file."""
        try:
            # Try UTF-8 first
            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    return file.read()
            except UnicodeDecodeError:
                # Fall back to other encodings if UTF-8 fails
                for encoding in ['latin-1', 'cp1252', 'iso-8859-1']:
                    try:
                        with open(file_path, 'r', encoding=encoding) as file:
                            logger.info(f"Successfully read {file_path} with {encoding} encoding")
                            return file.read()
                    except UnicodeDecodeError:
                        continue

                # If all encodings fail, use binary mode and decode as much as possible
                with open(file_path, 'rb') as file:
                    binary_data = file.read()
                    # Try to decode with errors='replace' to substitute invalid chars
                    text = binary_data.decode('utf-8', errors='replace')
                    logger.warning(f"Used fallback binary reading for {file_path}")
                    return text

        except Exception as e:
            logger.error(f"Error extracting text from TXT {file_path}: {e}")
            # Return a fallback message instead of raising an exception
            return f"[ERROR PROCESSING TEXT FILE: {str(e)}]"

    @staticmethod
    def extract_from_markdown(file_path: Path) -> str:
        """Extract text from a Markdown file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                md_text = file.read()

            if not markdown_available:
                logger.warning("markdown and/or BeautifulSoup modules not installed. Using raw markdown text.")
                # Just return the raw markdown text if we can't process it
                return md_text

            # Convert markdown to HTML
            html = markdown.markdown(md_text)

            # Extract text from HTML
            soup = BeautifulSoup(html, 'html.parser')
            text = soup.get_text()

            return text

        except Exception as e:
            logger.error(f"Error extracting text from Markdown {file_path}: {e}")
            # Return a fallback message instead of raising an exception
            return f"[ERROR PROCESSING MARKDOWN: {str(e)}]"
