"""
Split documents into chunks for embedding and retrieval.
"""
import re
from typing import List, Dict, Any
from ..utils.logger import get_logger

logger = get_logger(__name__)

class TextChunker:
    """Split documents into chunks for embedding and retrieval."""
    
    def __init__(self, chunk_size: int = 1200, chunk_overlap: int = 300, include_overlap_in_chunk: bool = True):
        """
        Initialize the text chunker.
        
        Args:
            chunk_size: Target size of each chunk in characters
            chunk_overlap: Overlap between chunks in characters
            include_overlap_in_chunk: Whether to include overlap text in the current chunk
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.include_overlap_in_chunk = include_overlap_in_chunk
    
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
        Split text into chunks with paragraph-awareness and optional overlap.
        """
        # Step 1: Paragraph split first (retain structure)
        paragraphs = text.split('\n\n')
        paragraphs = [re.sub(r'\s+', ' ', para).strip() for para in paragraphs if para.strip()]

        chunks = []
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) + 2 <= self.chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())

                if len(para) > self.chunk_size:
                    logger.warning(f"Oversized paragraph of length {len(para)} – will be force-split.")
                    for i in range(0, len(para), self.chunk_size - self.chunk_overlap):
                        sub_chunk = para[i:i + self.chunk_size]
                        chunks.append(sub_chunk.strip())
                    current_chunk = ""
                else:
                    current_chunk = para + "\n\n"

        if current_chunk:
            chunks.append(current_chunk.strip())

        # Step 2: Overlap logic
        final_chunks = []
        for i, chunk in enumerate(chunks):
            if i > 0 and self.chunk_overlap > 0:
                overlap = chunks[i - 1][-self.chunk_overlap:]
                chunk = overlap + chunk if self.include_overlap_in_chunk else chunk
            final_chunks.append(chunk.strip())

        return final_chunks


        
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
