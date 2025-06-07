"""
Async Redis caching for queries and responses with hashed keys and robust error handling.
"""
import os
import json
import hashlib
import asyncio
from typing import Dict, Any, Optional

import redis.asyncio as redis_async  # async Redis client
import redis  # sync Redis client
from dotenv import load_dotenv

from ..utils.logger import get_logger

# Load environment variables from .env file
load_dotenv()

# Fetch Redis connection details from environment variables
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = None  # None if not set

logger = get_logger(__name__)

class RedisCache:
    """Async Redis-based caching for queries and responses with key hashing and retries."""

    def __init__(self,
                 host: str = REDIS_HOST,
                 port: int = REDIS_PORT,
                 password:str = REDIS_PASSWORD,
                 max_retries: int = 3,
                 retry_delay: float = 0.2):
        """
        Initialize Redis cache.

        Args:
            host: Redis host
            port: Redis port
            password: Redis password
            max_retries: Max retries on Redis ops
            retry_delay: Delay between retries in seconds
        """
        # Initialize both sync and async clients
        self.redis_async = redis_async.Redis(
            host=host,
            port=port,
            password=password if password else None,
            decode_responses=True,
            socket_keepalive=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        self.redis_sync = redis.Redis(
            host=host,
            port=port,
            password=password if password else None,
            decode_responses=True,
            socket_keepalive=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        self.max_retries = max_retries
        self.retry_delay = retry_delay

        # Cache expiration times (in seconds)
        self.expiration_times = {
            "query": 3600,       # 1 hour
            "embedding": 86400,  # 24 hours
            "response": 1800,    # 30 minutes
        }

    @staticmethod
    def _hash_key(text: str) -> str:
        """Normalize and hash text to create a fixed-length cache key part."""
        normalized = text.strip().lower()
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

    def _get_cache_key(self, key_type: str, identifier: str) -> str:
        """Generate a cache key with hashed identifier."""
        hashed_id = self._hash_key(identifier)
        return f"hr_chatbot:{key_type}:{hashed_id}"

    async def _retry_redis_call_async(self, func, *args, **kwargs):
        """Helper to retry redis operations with backoff (async)."""
        for attempt in range(1, self.max_retries + 1):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Redis operation failed (attempt {attempt}/{self.max_retries}): {e}")
                if attempt == self.max_retries:
                    return None
                await asyncio.sleep(self.retry_delay * attempt)

    def _retry_redis_call_sync(self, func, *args, **kwargs):
        """Helper to retry redis operations with backoff (sync)."""
        for attempt in range(1, self.max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Redis operation failed (attempt {attempt}/{self.max_retries}): {e}")
                if attempt == self.max_retries:
                    return None
                time.sleep(self.retry_delay * attempt)

    # Query cache methods (async)
    async def get_cached_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Get cached response for a query (async)."""
        key = self._get_cache_key("query", query)
        cached = await self._retry_redis_call_async(self.redis_async.get, key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for cached query data: {e}")
                return None
        return None

    async def cache_query(self, query: str, response: Dict[str, Any]):
        """Cache a query response (async)."""
        key = self._get_cache_key("query", query)
        data = json.dumps(response)
        await self._retry_redis_call_async(
            self.redis_async.setex,
            key,
            self.expiration_times["query"],
            data
        )

    # Query cache methods (sync)
    def get_cached_query_sync(self, query: str) -> Optional[Dict[str, Any]]:
        """Get cached response for a query (sync)."""
        key = self._get_cache_key("query", query)
        cached = self._retry_redis_call_sync(self.redis_sync.get, key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for cached query data: {e}")
                return None
        return None

    def cache_query_sync(self, query: str, response: Dict[str, Any]):
        """Cache a query response (sync)."""
        key = self._get_cache_key("query", query)
        data = json.dumps(response)
        self._retry_redis_call_sync(
            self.redis_sync.setex,
            key,
            self.expiration_times["query"],
            data
        )

    # Embedding cache methods (async)
    async def get_cached_embedding(self, text: str) -> Optional[list]:
        """Get cached embedding for text (async)."""
        key = self._get_cache_key("embedding", text)
        cached = await self._retry_redis_call_async(self.redis_async.get, key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for cached embedding data: {e}")
                return None
        return None

    async def cache_embedding(self, text: str, embedding: list):
        """Cache an embedding (async)."""
        key = self._get_cache_key("embedding", text)
        data = json.dumps(embedding)
        await self._retry_redis_call_async(
            self.redis_async.setex,
            key,
            self.expiration_times["embedding"],
            data
        )

    # Embedding cache methods (sync)
    def get_cached_embedding_sync(self, text: str) -> Optional[list]:
        """Get cached embedding for text (sync)."""
        key = self._get_cache_key("embedding", text)
        cached = self._retry_redis_call_sync(self.redis_sync.get, key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for cached embedding data: {e}")
                return None
        return None

    def cache_embedding_sync(self, text: str, embedding: list):
        """Cache an embedding (sync)."""
        key = self._get_cache_key("embedding", text)
        data = json.dumps(embedding)
        self._retry_redis_call_sync(
            self.redis_sync.setex,
            key,
            self.expiration_times["embedding"],
            data
        )

    # Response cache methods (async)
    async def get_cached_response(self, response_id: str) -> Optional[Dict[str, Any]]:
        """Get cached response by ID (async)."""
        key = self._get_cache_key("response", response_id)
        cached = await self._retry_redis_call_async(self.redis_async.get, key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for cached response data: {e}")
                return None
        return None

    async def cache_response(self, response_id: str, response: Dict[str, Any]):
        """Cache a response (async)."""
        key = self._get_cache_key("response", response_id)
        data = json.dumps(response)
        await self._retry_redis_call_async(
            self.redis_async.setex,
            key,
            self.expiration_times["response"],
            data
        )

    # Response cache methods (sync)
    def get_cached_response_sync(self, response_id: str) -> Optional[Dict[str, Any]]:
        """Get cached response by ID (sync)."""
        key = self._get_cache_key("response", response_id)
        cached = self._retry_redis_call_sync(self.redis_sync.get, key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for cached response data: {e}")
                return None
        return None

    def cache_response_sync(self, response_id: str, response: Dict[str, Any]):
        """Cache a response (sync)."""
        key = self._get_cache_key("response", response_id)
        data = json.dumps(response)
        self._retry_redis_call_sync(
            self.redis_sync.setex,
            key,
            self.expiration_times["response"],
            data
        )

    # Cache maintenance (async)
    async def clear_cache(self, key_type: Optional[str] = None):
        """Clear cache entries by type or all (async)."""
        try:
            if key_type:
                pattern = f"hr_chatbot:{key_type}:*"
            else:
                pattern = "hr_chatbot:*"

            keys = await self._retry_redis_call_async(self.redis_async.keys, pattern)
            if keys:
                await self._retry_redis_call_async(self.redis_async.delete, *keys)
                logger.info(f"Cleared {len(keys)} cache entries")
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")

    # Cache maintenance (sync)
    def clear_cache_sync(self, key_type: Optional[str] = None):
        """Clear cache entries by type or all (sync)."""
        try:
            if key_type:
                pattern = f"hr_chatbot:{key_type}:*"
            else:
                pattern = "hr_chatbot:*"

            keys = self._retry_redis_call_sync(self.redis_sync.keys, pattern)
            if keys:
                self._retry_redis_call_sync(self.redis_sync.delete, *keys)
                logger.info(f"Cleared {len(keys)} cache entries")
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")

    # Cache stats (async)
    async def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics: count keys per cache type (async)."""
        stats = {}
        try:
            for key_type in self.expiration_times:
                pattern = f"hr_chatbot:{key_type}:*"
                keys = await self._retry_redis_call_async(self.redis_async.keys, pattern)
                stats[key_type] = len(keys) if keys else 0
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
        return stats

    # Cache stats (sync)
    def get_cache_stats_sync(self) -> Dict[str, int]:
        """Get cache statistics: count keys per cache type (sync)."""
        stats = {}
        try:
            for key_type in self.expiration_times:
                pattern = f"hr_chatbot:{key_type}:*"
                keys = self._retry_redis_call_sync(self.redis_sync.keys, pattern)
                stats[key_type] = len(keys) if keys else 0
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
        return stats
