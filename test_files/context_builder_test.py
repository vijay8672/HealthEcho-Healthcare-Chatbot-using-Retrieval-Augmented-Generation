import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.retrieval.context_builder import ContextBuilder

@pytest.mark.asyncio
async def test_build_context_basic():
    mock_vector_search = MagicMock()
    mock_vector_search.search = AsyncMock(return_value=[
        {"content": "Policy A says all employees must...", "title": "Policy A", "source_file": "policy_a.txt", "score": 0.92},
        {"content": "Refer to Policy B for leave details...", "title": "Policy B", "source_file": "policy_b.txt", "score": 0.89}
    ])

    context_builder = ContextBuilder(
        vector_search=mock_vector_search,
        tokenizer=lambda x: len(x.split()),
        monitoring_hook=lambda metric, value: print(f"Metric: {metric} = {value}")
    )

    result = await context_builder.build_context("Tell me about leave", max_tokens=100)
    assert "Policy A" in result["context"] or "Policy B" in result["context"]
    assert len(result["sources"]) == 2
    assert any("Policy A" in src["title"] for src in result["sources"])

@pytest.mark.asyncio
async def test_build_context_retry_logic():
    # First 2 calls fail, third succeeds
    failing_mock = AsyncMock(side_effect=[
        Exception("Temporary fail 1"),
        Exception("Temporary fail 2"),
        [{"content": "Valid result", "title": "Doc", "source_file": "doc.txt", "score": 1.0}]
    ])

    context_builder = ContextBuilder(
        vector_search=MagicMock(search=failing_mock)
    )

    result = await context_builder.build_context("termination", max_tokens=50)
    assert "Valid result" in result["context"]
    assert len(result["sources"]) == 1

@pytest.mark.asyncio
async def test_format_context_with_sources():
    builder = ContextBuilder()
    context_result = {
        "context": "This is the context body.",
        "sources": [
            {"title": "Doc A", "source_file": "a.txt", "score": 0.91},
            {"title": "Doc B", "source_file": "b.txt", "score": 0.85}
        ]
    }
    formatted = builder.format_context_with_sources(context_result)
    assert "Sources:" in formatted
    assert "1. Doc A" in formatted
    assert "2. Doc B" in formatted

@pytest.mark.asyncio
async def test_context_respects_token_limit():
    long_content = "Word " * 1000
    mock_vector_search = MagicMock()
    mock_vector_search.search = AsyncMock(return_value=[
        {"content": long_content, "title": "Huge Doc", "source_file": "huge.txt", "score": 0.95}
    ])

    builder = ContextBuilder(vector_search=mock_vector_search, tokenizer=lambda x: len(x.split()))
    result = await builder.build_context("leave", max_tokens=50)
    assert len(result["context"].split()) <= 50 * 4  # rough char/token ratio

