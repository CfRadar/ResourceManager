"""Sentence-transformers embedding wrapper and in-memory vector indexing.

Provides semantic vector indexing using sentence-transformers (all-MiniLM-L6-v2).
Implements Searchable Document builder, in-memory cosine similarity indexing,
and graceful offline/lazy model loading per Step 04 blueprint and Spec §6.3.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger("uviage.embedder")


def build_searchable_document(resource: Dict[str, Any]) -> str:
    """Combines structured and unstructured fields of a resource into a single document string.

    Spec §6.3: Searchable Document Builder.
    """
    capabilities = resource.get("capabilities") or []
    capabilities_str = ", ".join(capabilities) if isinstance(capabilities, list) else str(capabilities)

    specs = resource.get("specs") or {}
    specs_str = " ".join([f"{k}: {v}" for k, v in specs.items()]) if isinstance(specs, dict) else str(specs)

    category = resource.get("category") or ""
    name = resource.get("name") or ""
    description = resource.get("description") or ""
    facility_name = resource.get("facility_name") or ""
    facility_city = resource.get("facility_city") or ""

    return (
        f"Resource: {name}\n"
        f"Category: {category}\n"
        f"Capabilities: {capabilities_str}\n"
        f"Specifications: {specs_str}\n"
        f"Description: {description}\n"
        f"Facility: {facility_name} in {facility_city}"
    ).strip()


class VectorIndexer:
    """In-memory vector index for semantic similarity search over laboratory resources."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        self._model = None
        self.resource_ids: List[str] = []
        self.embeddings: Optional[np.ndarray] = None

    def is_ready(self) -> bool:
        """Return True if the underlying neural model is loaded into memory."""
        return self._model is not None

    def load_model(self, model_instance: Optional[Any] = None) -> bool:
        """Load the SentenceTransformer model or inject a pre-loaded instance.

        If loading fails (e.g. offline, no internet, or cache miss), logs a warning
        and returns False so callers can gracefully fall back to BM25.
        """
        if model_instance is not None:
            self._model = model_instance
            return True

        try:
            from sentence_transformers import SentenceTransformer

            # Attempt local cache load or download
            self._model = SentenceTransformer(self.model_name)
            logger.info("SentenceTransformer model '%s' loaded successfully.", self.model_name)
            return True
        except Exception as exc:
            logger.warning(
                "Could not load SentenceTransformer model '%s': %s. "
                "System will operate using deterministic BM25 keyword fallback.",
                self.model_name,
                exc,
            )
            self._model = None
            return False

    def index_resources(self, resources: List[Dict[str, Any]]) -> int:
        """Build searchable documents and compute normalized vector embeddings.

        Returns the number of indexed resources.
        """
        self.resource_ids = [r["id"] for r in resources if "id" in r]
        if not self.resource_ids:
            self.embeddings = None
            return 0

        if not self.is_ready():
            logger.debug("VectorIndexer model is not ready. Skipping vector computation.")
            self.embeddings = None
            return len(self.resource_ids)

        docs = [build_searchable_document(r) for r in resources if "id" in r]
        try:
            encoded = self._model.encode(docs, normalize_embeddings=True)
            self.embeddings = np.array(encoded, dtype=np.float32)
            logger.info("Successfully indexed %d resources into VectorIndexer.", len(self.resource_ids))
            return len(self.resource_ids)
        except Exception as exc:
            logger.error("Failed to generate vector embeddings: %s", exc)
            self.embeddings = None
            return 0

    def query(self, query_text: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """Query the vector index and return top_k (resource_id, cosine_similarity) pairs."""
        if not self.is_ready() or self.embeddings is None or len(self.resource_ids) == 0:
            return []

        try:
            query_vec = self._model.encode([query_text], normalize_embeddings=True)[0]
            # Since vectors are normalized, dot product equals cosine similarity
            similarities = np.dot(self.embeddings, query_vec)

            # Sort descending
            ranked_indices = np.argsort(similarities)[::-1][:top_k]
            return [
                (self.resource_ids[i], float(similarities[i]))
                for i in ranked_indices
                if similarities[i] > 0.0
            ]
        except Exception as exc:
            logger.error("Vector query execution failed: %s", exc)
            return []


# Global singleton instance for UviAge microservice
vector_indexer = VectorIndexer()


def is_ready() -> bool:
    """Return model readiness status without downloading heavy weights."""
    return vector_indexer.is_ready()
