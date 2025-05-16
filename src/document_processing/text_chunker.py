"""
Split documents into chunks for embedding and retrieval.
"""
import re
from typing import List, Dict, Any
from ..utils.logger import get_logger

logger = get_logger(__name__)

class TextChunker:
    """Split documents into chunks for embedding and retrieval."""
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 100):
        """
        Initialize the text chunker.
        
        Args:
            chunk_size: Target size of each chunk in characters
            chunk_overlap: Overlap between chunks in characters
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def chunk_document(self, document: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split a document into chunks.
        
        Args:
            document: Document dictionary with title and content
            
        Returns:
            List of document chunk dictionaries
        """
        content = document["content"]
        title = document["title"]
        source_file = document["source_file"]
        
        # Split content into chunks
        chunks = self._split_text(content)
        
        # Create document chunks
        document_chunks = []
        for i, chunk in enumerate(chunks):
            document_chunks.append({
                "title": f"{title} - Part {i+1}",
                "content": chunk,
                "source_file": source_file,
                "chunk_index": i
            })
        
        logger.info(f"Split document '{title}' into {len(document_chunks)} chunks")
        return document_chunks
    
    def _split_text(self, text: str) -> List[str]:
        """
        Split text into chunks with overlap.
        
        Args:
            text: Text to split
            
        Returns:
            List of text chunks
        """
        # Clean and normalize text
        text = re.sub(r'\s+', ' ', text).strip()
        
        # If text is shorter than chunk size, return as is
        if len(text) <= self.chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            # Find the end of the chunk
            end = start + self.chunk_size
            
            if end >= len(text):
                # Last chunk
                chunks.append(text[start:])
                break
            
            # Try to find a sentence boundary for a cleaner split
            sentence_end = self._find_sentence_boundary(text, end)
            if sentence_end > start:
                end = sentence_end
            
            # Add the chunk
            chunks.append(text[start:end])
            
            # Move to next chunk with overlap
            start = end - self.chunk_overlap
        
        return chunks
    
    def _find_sentence_boundary(self, text: str, position: int) -> int:
        """
        Find the nearest sentence boundary after the given position.
        
        Args:
            text: Text to search in
            position: Starting position
            
        Returns:
            Position of the nearest sentence boundary
        """
        # Look for sentence-ending punctuation followed by space or end of text
        sentence_end_pattern = r'[.!?]\s+'
        
        # Search for the pattern after the position
        search_text = text[position:min(position + 100, len(text))]
        match = re.search(sentence_end_pattern, search_text)
        
        if match:
            # Return the position of the end of the sentence
            return position + match.end()
        
        # If no sentence boundary found, look for other boundaries
        # Try paragraph break
        paragraph_break = text.find('\n\n', position, position + 100)
        if paragraph_break != -1:
            return paragraph_break + 2
        
        # Try any whitespace
        whitespace = text.find(' ', position, position + 50)
        if whitespace != -1:
            return whitespace + 1
        
        # If all else fails, just return the original position
        return position
