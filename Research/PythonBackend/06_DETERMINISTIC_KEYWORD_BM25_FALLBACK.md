# Step 06: Deterministic Keyword & BM25 Fallback Engine

This guide details the offline, zero-token deterministic fallback engine providing reliable search results when model weights or embeddings are unavailable.

---

## 1. Why a Deterministic Fallback is Mandatory (Section 6.3)

In network-constrained environments, cold starts, or high-load conditions where neural inference times out (>4s), the system must degrade gracefully.
The response flags `source = "KEYWORD_FALLBACK"`, and the UI displays *"Keyword search (AI unavailable)"*.

---

## 2. Laboratory Domain Synonym Dictionary (`matching/fallback.py`)

Equips the search with domain-specific engineering & scientific equivalence mappings:

```python
SYNONYM_DICT = {
    # Fabrication
    "3d print": ["additive manufacturing", "fdm", "sla", "sls", "stereolithography", "rapid prototyping"],
    "laser": ["laser cutter", "engraver", "co2 laser", "fiber laser"],
    "cnc": ["milling", "router", "lathe", "subtractive manufacturing", "machining"],
    
    # Characterization & Microscopy
    "sem": ["scanning electron microscope", "electron microscopy", "edx", "high magnification"],
    "tem": ["transmission electron microscope"],
    "afm": ["atomic force microscope", "surface topography"],
    "scope": ["oscilloscope", "digital storage oscilloscope", "mixed signal"],
    "spectrometer": ["ftir", "raman", "uv-vis", "mass spec", "gc-ms"],
    
    # Electronics
    "soldering": ["surface mount", "rework station", "smd", "through-hole"],
    "autoclave": ["sterilization", "steam sterilizer", "biohazard"]
}
```

---

## 3. BM25 / TF-IDF Scoring Implementation

Using `rank_bm25` (or `scikit-learn`):

```python
from rank_bm25 import BM25Okapi

class BM25Searcher:
    def __init__(self):
        self.corpus_ids: list[str] = []
        self.bm25: BM25Okapi | None = None

    def index(self, resources: list[dict]):
        self.corpus_ids = [r["id"] for r in resources]
        tokenized_corpus = [
            self._tokenize(r["name"] + " " + r["category"] + " " + " ".join(r.get("capabilities", [])))
            for r in resources
        ]
        if tokenized_corpus:
            self.bm25 = BM25Okapi(tokenized_corpus)

    def _tokenize(self, text: str) -> list[str]:
        words = text.lower().replace("-", " ").split()
        expanded = list(words)
        for w in words:
            if w in SYNONYM_DICT:
                expanded.extend(SYNONYM_DICT[w])
        return expanded

    def search(self, query: str, top_k: int = 10) -> list[tuple[str, float]]:
        if not self.bm25:
            return []
        tokenized_query = self._tokenize(query)
        scores = self.bm25.get_scores(tokenized_query)
        ranked = sorted(zip(self.corpus_ids, scores), key=lambda x: x[1], reverse=True)[:top_k]
        return [(cid, float(score)) for cid, score in ranked if score > 0]
```

---

## 4. Implementation Checklist

- [ ] Add `rank-bm25` to `UviAge/requirements.txt`.
- [ ] Implement synonym dictionary expansions.
- [ ] Write unit test verifying that searching for "scope" matches an "Oscilloscope" resource using the keyword fallback.
