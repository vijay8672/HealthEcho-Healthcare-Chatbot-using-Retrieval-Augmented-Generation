"""
Build context from retrieved document chunks with async, retries, dynamic config, pluggable tokenizer, and monitoring hooks.
"""
import asyncio
import logging
import time
from typing import List, Dict, Any, Optional, Callable
from functools import wraps

from ..utils.logger import get_logger
from .vector_search import VectorSearch

logger = get_logger(__name__)

def retry_async(times: int = 3, delay: float = 1.0, exceptions=(Exception,)):
    """Simple async retry decorator with delay."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    logger.warning(f"Attempt {attempt}/{times} failed with error: {e}")
                    if attempt == times:
                        raise
                    await asyncio.sleep(delay)
        return wrapper
    return decorator


class ContextBuilder:
    """
    Build context from retrieved document chunks asynchronously.
    Supports pluggable tokenizer, config-driven policy keywords,
    error handling with retries, and monitoring hooks.
    """

    def __init__(
        self,
        vector_search: Optional[VectorSearch] = None,
        tokenizer: Optional[Callable[[str], int]] = None,
        policy_keywords: Optional[Dict[str, List[str]]] = None,
        monitoring_hook: Optional[Callable[[str, float], None]] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        self.vector_search = vector_search or VectorSearch()
        # Default tokenizer: crude approximation counting words as tokens
        self.tokenizer = tokenizer or (lambda text: len(text.split()))
        # Default policy keywords, can be overridden
        self.policy_keywords = policy_keywords or {
            "termination": ["termination", "firing", "layoff", "severance", "dismissal"],
            "leave": ["leave", "vacation", "time off", "sick", "absence", "pto"],
            "dress code": ["dress", "attire", "clothing", "appearance", "uniform"],
            "referral": ["referral", "refer", "recommendation", "recommend"],
            "work from home": ["work from home", "wfh", "remote", "telework", "telecommute"]
        }
        self.monitoring_hook = monitoring_hook
        self.max_retries = max_retries
        self.retry_delay = retry_delay

    @retry_async()
    async def _search_documents(self, query: str, top_k: int, prioritize_files: List[str]) -> List[Dict[str, Any]]:
        """Async wrapper for vector_search.search with retries."""
        # If vector_search.search is sync, wrap in thread executor
        if asyncio.iscoroutinefunction(self.vector_search.search):
            return await self.vector_search.search(query, top_k=top_k, prioritize_files=prioritize_files)
        else:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None, lambda: self.vector_search.search(query, top_k=top_k, prioritize_files=prioritize_files)
            )

    async def build_context(
        self,
        query: str,
        max_tokens: int = 2000,
        files_info: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Build a context string and source metadata for a query asynchronously."""
        start_time = time.time()
        top_k = min(10, max(3, max_tokens // 300))

        # Calculate char limit based on tokenizer average token size
        # Here we approximate avg token length as total chars / token count on sample text
        avg_token_len = 4
        try:
            sample_tokens = self.tokenizer("This is a sample sentence to estimate token length.")
            avg_token_len = max(1, len("This is a sample sentence to estimate token length.") // sample_tokens)
        except Exception:
            pass  # fallback to default 4 chars/token

        char_limit = max_tokens * avg_token_len

        # Extract priority files
        file_names = [
            file.get('source_file') or file.get('name')
            for file in files_info or []
            if file.get('source_file') or file.get('name')
        ]
        if file_names:
            logger.info(f"Prioritizing search for files: {file_names}")

        # Enhance query if it contains policy-relevant keywords from config
        enhanced_query = query
        lower_query = query.lower()
        for policy, keywords in self.policy_keywords.items():
            if any(k in lower_query for k in keywords):
                enhanced_query = f"{policy} policy: {query}"
                logger.info(f"Enhanced query with policy type '{policy}'")
                break

        try:
            documents = await self._search_documents(
                enhanced_query,
                top_k=top_k,
                prioritize_files=file_names
            )
        except Exception as e:
            logger.error(f"Vector search failed after retries: {e}")
            return {"context": "", "sources": []}

        if not documents:
            logger.warning("No relevant documents found.")
            return {"context": "", "sources": []}

        documents.sort(key=lambda d: d.get("score", 0), reverse=True)

        context_parts = []
        sources = []
        total_chars = 0

        for doc in documents:
            content = doc.get("content", "").strip()
            if not content:
                continue

            content_length = len(content)
            remaining_chars = char_limit - total_chars

            if content_length > remaining_chars:
                if remaining_chars >= 300:  # Minimum viable chunk
                    cutoff = self._find_sentence_cutoff(content, remaining_chars)
                    truncated = content[:cutoff].strip()
                    context_parts.append(truncated)
                    total_chars += len(truncated)
                break
            else:
                context_parts.append(content)
                total_chars += content_length

            source_info = {
                "title": doc.get("title", "Untitled"),
                "source_file": doc.get("source_file", "Unknown"),
                "score": doc.get("score", 0)
            }
            if not any(s["title"] == source_info["title"] and s["source_file"] == source_info["source_file"] for s in sources):
                sources.append(source_info)

        context = "\n\n---\n\n".join(context_parts)

        elapsed = time.time() - start_time
        logger.info(
            f"Built context: {total_chars} chars (~{self.tokenizer(context)} tokens) "
            f"from {len(sources)} sources in {elapsed:.2f}s"
        )

        if self.monitoring_hook:
            try:
                self.monitoring_hook("context_build_time_seconds", elapsed)
                self.monitoring_hook("context_sources_count", len(sources))
            except Exception as e:
                logger.warning(f"Monitoring hook failed: {e}")

        return {"context": context, "sources": sources}

    def _find_sentence_cutoff(self, text: str, limit: int) -> int:
        """Find a clean sentence boundary before limit."""
        end = text.rfind('.', 0, limit)
        if end == -1:
            end = text.rfind(' ', 0, limit)
        return end + 1 if end != -1 else limit

    def format_context_with_sources(self, context_result: Dict[str, Any]) -> str:
        """Append sources to context as numbered list."""
        context = context_result.get("context", "")
        sources = context_result.get("sources", [])
        if not context:
            return ""

        source_text = "\n\nSources:\n"
        for i, source in enumerate(sources, start=1):
            source_text += f"{i}. {source['title']} (Relevance: {source['score']:.2f})\n"

        return context + source_text
