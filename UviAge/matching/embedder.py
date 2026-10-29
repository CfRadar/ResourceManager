"""Sentence-transformers embedding wrapper stub.

Exposes is_ready() returning False until a model is explicitly loaded.
Do not download heavy model checkpoints during initialization.
"""

from typing import List, Optional


class Embedder:
    """Embedding model wrapper for semantic search and capability matching."""

    def __init__(self, model_name: Optional[str] = None) -> None:
        self.model_name = model_name
        self._model = None

    def is_ready(self) -> bool:
        """Return True if model is loaded into memory, False otherwise."""
        return self._model is not None

    def load_model(self) -> None:
        """TODO: Implemented in a later step (Step 04: Vector Indexing)."""
        raise NotImplementedError("Model loading is deferred to Step 04.")

    def embed_text(self, text: str) -> List[float]:
        """TODO: Implemented in a later step (Step 04: Vector Indexing)."""
        raise NotImplementedError("Text embedding is deferred to Step 04.")

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """TODO: Implemented in a later step (Step 04: Vector Indexing)."""
        raise NotImplementedError("Batch embedding is deferred to Step 04.")


# Module singleton instance
_embedder_instance = Embedder()


def is_ready() -> bool:
    """Return model readiness status without downloading heavy weights."""
    return _embedder_instance.is_ready()

