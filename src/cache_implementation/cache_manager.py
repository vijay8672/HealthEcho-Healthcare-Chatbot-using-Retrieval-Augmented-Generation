import redis
import json
import os
from src.logging.logger import logger
from dotenv import load_dotenv

load_dotenv()


class CacheManager:
    def __init__(self):
        # Get the Redis configuration from environment variables or use defaults
        self.redis_host = os.getenv("REDIS_HOST")
        self.redis_port = os.getenv("REDIS_PORT")
        self.redis_password = os.getenv("REDIS_PASSWORD")

        # Create a Redis client
        self.client = redis.StrictRedis(
            host=self.redis_host,
            port=self.redis_port,
            password=self.redis_password,
            decode_responses=True,
            socket_timeout=15,  # 5 seconds timeout for read/write operations
            socket_connect_timeout=15,  # 5 seconds connection timeout
            retry_on_timeout=True,  # Retry on timeout
        )

        try:
            # Test the Redis connection
            self.client.ping()
            logger.info("Successfully connected to Redis!")
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error: {e}", exc_info=True)
            raise

    def create_cache(self, key, value, ttl=86400):
        try:
            # Convert the value to JSON format before storing in Redis
            value_json = json.dumps(value)
            # Store data in Redis with TTL (Time-To-Live)
            self.client.setex(key, ttl, value_json)
            logger.info(f"Data cached with key: {key}")
        except Exception as e:
            logger.error(f"Error setting cache for key {key}: {e}", exc_info=True)

    def retrieve_cache(self, key):
        try:
            # Retrieve data from Redis
            value_json = self.client.get(key)
            if value_json is None:
                logger.info(f"No data found in cache for key: {key}")
                return None
            
            # Deserialize the data back to the original format
            logger.info(f"Data retrieved from cache for key: {key}")
            return json.loads(value_json)
        
        except Exception as e:
            logger.error(f"Error getting cache for key {key}: {e}", exc_info=True)
            return None

    def delete_cache(self, key):
        try:
            # Delete the cache for the given key
            result = self.client.delete(key)
            if result == 1:
                logger.info(f"Cache cleared for key: {key}")
            else:
                logger.info(f"No cache found for key: {key}")
        except Exception as e:
            logger.error(f"Error deleting cache for key {key}: {e}", exc_info=True)

    def clear_all_cache(self):
        try:
            # Clear all databases on the Redis server (not just the current one)
            self.client.flushall()  # Use flushall() to clear all databases
            logger.info("All cache cleared successfully!")
        except Exception as e:
            logger.error(f"Error clearing all cache: {e}", exc_info=True)

if __name__ == "__main__":

    # Initialize CacheManager instance
    cache_manager = CacheManager()

    # Test cache methods
    test_key = "user:123"
    test_value = {"name": "John Doe", "age": 30}

    # Create cache
    cache_manager.create_cache(test_key, test_value, ttl=600)

    # Retrieve data from cache
    retrieved_data = cache_manager.retrieve_cache(test_key)
    print("Retrieved Data:", retrieved_data)

    # Delete cache for the key
    ## cache_manager.delete_cache(test_key)

    # Optionally, clear all cache (be cautious with this in production)
    # cache_manager.clear_all_cache()
