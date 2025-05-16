"""
Build context from retrieved document chunks.
"""
from typing import List, Dict, Any, Optional
import re

from ..utils.logger import get_logger
from .vector_search import VectorSearch

logger = get_logger(__name__)

class ContextBuilder:
    """Build context from retrieved document chunks."""

    def __init__(self, vector_search: VectorSearch = None):
        """
        Initialize the context builder.

        Args:
            vector_search: Vector search for document retrieval
        """
        self.vector_search = vector_search or VectorSearch()

    def build_context(self, query: str, max_tokens: int = 2000, files_info: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Build context for a query.

        Args:
            query: Query text
            max_tokens: Maximum number of tokens to include in context
            files_info: List of files attached to the message

        Returns:
            Dictionary with context text and sources
        """
        # Search for relevant documents - limit to 10 for efficiency
        top_k = min(10, max(3, max_tokens // 300))  # Adaptive number based on max_tokens

        # If files_info is provided, prioritize those files in the search
        file_names = []
        if files_info:
            file_names = [file_info.get('name') for file_info in files_info if file_info.get('name')]
            logger.info(f"Prioritizing files: {file_names}")

        # Extract specific policy types from the query to improve search relevance
        policy_keywords = {
            "termination": ["termination", "firing", "layoff", "severance", "dismissal"],
            "leave": ["leave", "vacation", "time off", "sick", "absence", "pto"],
            "dress code": ["dress", "attire", "clothing", "appearance", "uniform"],
            "referral": ["referral", "refer", "recommendation", "recommend"],
            "work from home": ["work from home", "wfh", "remote", "telework", "telecommute"]
        }

        # Check if query contains specific policy keywords
        enhanced_query = query
        for policy_type, keywords in policy_keywords.items():
            if any(keyword in query.lower() for keyword in keywords):
                # Enhance the query with the policy type for better retrieval
                enhanced_query = f"{policy_type} policy: {query}"
                logger.info(f"Enhanced query with policy type: {policy_type}")
                break

        # Use the enhanced query for search
        documents = self.vector_search.search(enhanced_query, top_k=top_k, prioritize_files=file_names)

        if not documents:
            logger.info("No relevant documents found for query")
            return {
                "context": "",
                "sources": []
            }

        # Sort by relevance score
        documents.sort(key=lambda x: x["score"], reverse=True)

        # More accurate token estimation - approximately 4 chars per token for English
        # For other languages, this might vary
        chars_per_token = 4
        char_limit = max_tokens * chars_per_token

        # Build context text and track sources
        context_parts = []
        sources = []
        total_chars = 0

        # First, add the most relevant document chunks
        for doc in documents:
            # Add document content to context
            content = doc["content"]

            # Skip if adding this would exceed the limit
            if total_chars + len(content) > char_limit:
                # Try to add a truncated version if the document is large
                if len(content) > 1000 and total_chars < char_limit * 0.8:
                    # Add a truncated version that fits within the limit
                    available_chars = char_limit - total_chars
                    truncated_content = content[:available_chars - 100] + "..."
                    context_parts.append(truncated_content)
                    total_chars += len(truncated_content)
                else:
                    # Skip this document entirely
                    continue
            else:
                context_parts.append(content)
                total_chars += len(content)

            # Add source information
            source = {
                "title": doc["title"],
                "source_file": doc["source_file"],
                "score": doc["score"]
            }

            # Only add if not already in sources
            if not any(s["title"] == source["title"] for s in sources):
                sources.append(source)

        # Join context parts with clear separators
        context = "\n\n---\n\n".join(context_parts)

        # Log detailed information for monitoring
        logger.info(f"Built context with {len(context)} characters ({len(context) // chars_per_token} tokens) from {len(sources)} sources")
        logger.info(f"Context utilization: {total_chars / char_limit:.1%} of available token budget")

        return {
            "context": context,
            "sources": sources
        }

    def format_context_with_sources(self, context_result: Dict[str, Any]) -> str:
        """
        Format context with source citations.

        Args:
            context_result: Result from build_context

        Returns:
            Formatted context text with source citations
        """
        context = context_result["context"]
        sources = context_result["sources"]

        if not context:
            return ""

        # Add source citations
        source_citations = "\n\nSources:\n"
        for i, source in enumerate(sources):
            source_citations += f"{i+1}. {source['title']} (Relevance: {source['score']:.2f})\n"

        return context + source_citations
