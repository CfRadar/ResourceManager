# Step 04: Local Embeddings & Vector Indexing

This guide details generating vector embeddings for resources using `sentence-transformers` locally without cloud API costs or latency.

---

## 1. Embedding Model Selection (Section 6.3)

- **Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Characteristics:**
  - Compact (80 MB disk footprint).
  - High inference speed on CPU (~15ms per document).
  - 384-dimensional dense vectors.
  - Generates semantic embeddings for technical and scientific equipment.

---

## 2. Searchable Document Builder

To match user needs effectively, combine a resource's structured and unstructured fields into a single "Searchable Document":

```python
def build_searchable_document(resource: dict) -> str:
    capabilities_str = ", ".join(resource.get("capabilities", []))
    specs_str = " ".join([f"{k}: {v}" for k, v in (resource.get("specs") or {}).items()])
    
    return f"""
    Resource: {resource.get('name')}
    Category: {resource.get('category')}
    Capabilities: {capabilities_str}
    Specifications: {specs_str}
    Description: {resource.get('description', '')}
    Facility: {resource.get('facility_name', '')} in {resource.get('facility_city', '')}
    """.strip()
```

---

## 3. In-Memory Vector Index (`matching/embedder.py`)

For prototype and hackathon workloads (up to 5,000 resources), in-memory NumPy vector arrays provide sub-millisecond cosine similarity search:

```python
import numpy as np
from sentence_transformers import SentenceTransformer

class VectorIndexer:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.resource_ids: list[str] = []
        self.embeddings: np.ndarray | None = None

    def index_resources(self, resources: list[dict]):
        self.resource_ids = [r["id"] for r in resources]
        docs = [build_searchable_document(r) for r in resources]
        if docs:
            self.embeddings = self.model.encode(docs, normalize_embeddings=True)
        else:
            self.embeddings = None

    def query(self, query_text: str, top_k: int = 10) -> list[tuple[str, float]]:
        if self.embeddings is None or len(self.resource_ids) == 0:
            return []
        
        query_vec = self.model.encode([query_text], normalize_embeddings=True)[0]
        # Dot product of normalized vectors equals cosine similarity
        similarities = np.dot(self.embeddings, query_vec)
        
        ranked_indices = np.argsort(similarities)[::-1][:top_k]
        return [(self.resource_ids[i], float(similarities[i])) for i in ranked_indices]
```

---

## 4. Implementation Checklist

- [ ] Add `sentence-transformers` and `numpy` to `UviAge/requirements.txt`.
- [ ] Initialize `VectorIndexer` as a singleton in FastAPI lifespan context.
- [ ] Implement index rebuild endpoint `POST /ai/reindex`.
