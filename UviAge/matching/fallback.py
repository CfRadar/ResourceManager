"""Deterministic keyword and BM25 fallback matcher.

TODO: Implemented in a later step (Step 06: Deterministic Keyword BM25 Fallback).
"""

from typing import Any, Dict, List


class BM25FallbackMatcher:
    """Deterministic BM25 and keyword search for capability discovery."""

    def __init__(self) -> None:
        pass

    def search(
        self,
        query: str,
        corpus: List[Dict[str, Any]],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """TODO: Implemented in a later step (Step 06)."""
        raise NotImplementedError("BM25 fallback search is deferred to Step 06.")


def keyword_search(
    query: str,
    corpus: List[Dict[str, Any]],
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """TODO: Implemented in a later step (Step 06)."""
    raise NotImplementedError("Keyword search is deferred to Step 06.")

