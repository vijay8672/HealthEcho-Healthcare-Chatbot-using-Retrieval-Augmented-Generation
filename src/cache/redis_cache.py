"""
Redis caching for queries and responses.
"""
import json
import redis
from typing import Dict, Any, Optional
from datetime import timedelta

from ..utils.logger import get_logger
from ..config import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

logger = get_logger(__name__)

class RedisCache:
    """Redis-based caching for queries and responses."""

    def __init__(self,
                 host: str = REDIS_HOST,
                 port: int = REDIS_PORT,
                 password: str = REDIS_PASSWORD):
        """
        Initialize Redis cache.
        
        Args:
            host: Redis host
            port: Redis port
            password: Redis password
        """
        self.redis = redis.Redis(
            host=host,
            port=port,
            password=password,
            decode_responses=True
        )
        
        # Cache expiration times (in seconds)
        self.expiration_times = {
            "query": 3600,  # 1 hour
            "embedding": 86400,  # 24 hours
            "response": 1800,  # 30 minutes
        }

    def _get_cache_key(self, key_type: str, identifier: str) -> str:
        """Generate a cache key."""
        return f"hr_chatbot:{key_type}:{identifier}"

    def get_cached_query(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Get cached response for a query.
        
        Args:
            query: User query
            
        Returns:
            Cached response or None
        """
        try:
            key = self._get_cache_key("query", query)
            cached = self.redis.get(key)
            return json.loads(cached) if cached else None
        except Exception as e:
            logger.error(f"Error getting cached query: {e}")
            return None

    def cache_query(self, query: str, response: Dict[str, Any]):
        """
        Cache a query response.
        
        Args:
            query: User query
            response: Response dictionary
        """
        try:
            key = self._get_cache_key("query", query)
            self.redis.setex(
                key,
                self.expiration_times["query"],
                json.dumps(response)
            )
        except Exception as e:
            logger.error(f"Error caching query: {e}")

    def get_cached_embedding(self, text: str) -> Optional[list]:
        """
        Get cached embedding for text.
        
        Args:
            text: Input text
            
        Returns:
            Cached embedding or None
        """
        try:
            key = self._get_cache_key("embedding", text)
            cached = self.redis.get(key)
            return json.loads(cached) if cached else None
        except Exception as e:
            logger.error(f"Error getting cached embedding: {e}")
            return None

    def cache_embedding(self, text: str, embedding: list):
        """
        Cache an embedding.
        
        Args:
            text: Input text
            embedding: Embedding vector
        """
        try:
            key = self._get_cache_key("embedding", text)
            self.redis.setex(
                key,
                self.expiration_times["embedding"],
                json.dumps(embedding)
            )
        except Exception as e:
            logger.error(f"Error caching embedding: {e}")

    def get_cached_response(self, response_id: str) -> Optional[Dict[str, Any]]:
        """
        Get cached response by ID.
        
        Args:
            response_id: Response identifier
            
        Returns:
            Cached response or None
        """
        try:
            key = self._get_cache_key("response", response_id)
            cached = self.redis.get(key)
            return json.loads(cached) if cached else None
        except Exception as e:
            logger.error(f"Error getting cached response: {e}")
            return None

    def cache_response(self, response_id: str, response: Dict[str, Any]):
        """
        Cache a response.
        
        Args:
            response_id: Response identifier
            response: Response dictionary
        """
        try:
            key = self._get_cache_key("response", response_id)
            self.redis.setex(
                key,
                self.expiration_times["response"],
                json.dumps(response)
            )
        except Exception as e:
            logger.error(f"Error caching response: {e}")

    def clear_cache(self, key_type: Optional[str] = None):
        """
        Clear cache entries.
        
        Args:
            key_type: Type of cache to clear (None for all)
        """
        try:
            if key_type:
                pattern = self._get_cache_key(key_type, "*")
            else:
                pattern = "hr_chatbot:*"
            
            # Get all matching keys
            keys = self.redis.keys(pattern)
            
            # Delete keys
            if keys:
                self.redis.delete(*keys)
                logger.info(f"Cleared {len(keys)} cache entries")
            
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        try:
            stats = {}
            for key_type in self.expiration_times:
                pattern = self._get_cache_key(key_type, "*")
                keys = self.redis.keys(pattern)
                stats[key_type] = len(keys)
            return stats
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {} 