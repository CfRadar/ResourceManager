"""Smoke tests for matching package and stubs."""

from matching import embedder, fallback, rerank


def test_matching_stubs_import():
    """Verify matching stubs can be imported and expose expected initial states."""
    assert embedder.is_ready() is False
    assert hasattr(rerank, "MatchReranker")
    assert hasattr(rerank, "rerank_candidates")
    assert hasattr(fallback, "BM25FallbackMatcher")
    assert hasattr(fallback, "keyword_search")


def test_embedder_readiness():
    """Verify embedder instance reports not ready until loaded."""
    instance = embedder.Embedder()
    assert instance.is_ready() is False

