import pytest
from unittest.mock import MagicMock

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.retrieval.vector_search import VectorSearch


@pytest.fixture
def mock_dependencies():
    mock_vector_store = MagicMock()
    mock_embedding_generator = MagicMock()
    return mock_vector_store, mock_embedding_generator

def test_returns_filtered_results(mock_dependencies):
    vector_store, embedding_generator = mock_dependencies
    embedding_generator.generate_query_embedding.return_value = [0.1, 0.2, 0.3]

    vector_store.search.return_value = [
        {"score": 0.9, "source_file": "file1.txt"},
        {"score": 0.85, "source_file": "file2.txt"},
        {"score": 0.5, "source_file": "file3.txt"}
    ]

    searcher = VectorSearch(vector_store=vector_store, embedding_generator=embedding_generator)
    results = searcher.search("What is HR policy?", top_k=2)

    assert len(results) == 2
    assert all(r["score"] > 0.6 for r in results)

def test_prioritization_boosting_logic(mock_dependencies):
    vector_store, embedding_generator = mock_dependencies
    embedding_generator.generate_query_embedding.return_value = [0.1, 0.2, 0.3]

    vector_store.search.return_value = [
        {"score": 0.6, "source_file": "important_doc.md"},
        {"score": 0.65, "source_file": "other_doc.md"}
    ]

    searcher = VectorSearch(vector_store=vector_store, embedding_generator=embedding_generator)
    results = searcher.search("company leave policy", top_k=2, prioritize_files=["important_doc"])

    boosted = [r for r in results if r.get("prioritized")]
    assert len(boosted) == 1
    assert boosted[0]["source_file"] == "important_doc.md"
    assert boosted[0]["score"] > 0.6

def test_invalid_query_returns_empty_list(mock_dependencies):
    vector_store, embedding_generator = mock_dependencies
    searcher = VectorSearch(vector_store=vector_store, embedding_generator=embedding_generator)

    result = searcher.search("", top_k=3)
    assert result == []

def test_vectorstore_failure_returns_empty_list(mock_dependencies):
    vector_store, embedding_generator = mock_dependencies
    embedding_generator.generate_query_embedding.return_value = [0.2, 0.3, 0.4]
    vector_store.search.side_effect = Exception("DB error")

    searcher = VectorSearch(vector_store=vector_store, embedding_generator=embedding_generator)
    results = searcher.search("test fallback", top_k=3)
    assert results == []
