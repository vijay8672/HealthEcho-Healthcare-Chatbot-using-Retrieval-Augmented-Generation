import asyncio
from src.cache.redis_cache import RedisCache  # Adjust import as per your project structure

async def test_redis_cache():
    cache = RedisCache()

    # Test caching and retrieval of query response
    query = "What is leave policy?"
    response = {"content": "Our leave policy is 15 days per year.", "language": "en"}

    # Cache the query response
    await cache.cache_query(query, response)
    print("✅ Cached response")

    # Retrieve cached response
    cached_response = await cache.get_cached_query(query)
    print("✅ Cached response retrieved:", cached_response)

    assert cached_response == response, "❌ Cached response mismatch!"

    # Clear cache and check if it's gone
    await cache.clear_cache("query")
    cleared_response = await cache.get_cached_query(query)
    print("✅ After clearing cache, response:", cleared_response)
    assert cleared_response is None, "❌ Cache clear failed!"

if __name__ == "__main__":
    asyncio.run(test_redis_cache())