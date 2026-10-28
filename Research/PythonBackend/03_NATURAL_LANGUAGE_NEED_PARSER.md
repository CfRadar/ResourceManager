# Step 03: Natural Language Need Parser (`/ai/parse-need`)

This guide details how to turn unstructured research text into structured equipment requirements.

---

## 1. Objectives

A user might submit:
> *"I'm working on a micro-robotics thesis. I need to print small biocompatible gear components with high precision (around 50 micron layer height), and also need to inspect surface fractures under high magnification."*

The parser converts this into:
- Category: `fabrication`, `microscopy`
- Capabilities: `["high-resolution", "biocompatible", "stereolithography", "SEM", "high-magnification"]`
- Structured need items: `3D Printer (SLA/DLP)` and `Scanning Electron Microscope`
- Access mode suggestion: `INDEPENDENT` or `STAFF_SERVICE`

---

## 2. Extraction Pipeline (`parsing/need_parser.py`)

### 2.1 Keyword & Regex Pre-Pass
1. Match known laboratory categories from taxonomy:
   - `["fabrication", "electronics", "spectroscopy", "computing", "imaging", "materials-testing"]`
2. Extract numeric specs (e.g. `50 micron`, `100 kN`, `800 nm`).
3. Detect budget and timeframe phrases.

### 2.2 LLM / Rule-Based Structured Extraction
Use an LLM prompt (e.g. Gemini / local model) or deterministic rule matcher:

```python
SYSTEM_PROMPT = """
You are an expert institutional laboratory coordinator.
Analyze the user's research need and output strictly valid JSON conforming to:
{
  "items": [
    {"need": "<equipment name>", "categories": ["<category>"], "capabilities": ["<tag1>", "<tag2>"], "specs": {}}
  ],
  "accessModePreference": "INDEPENDENT" | "STAFF_SERVICE" | null,
  "confidence": 0.0 to 1.0
}
Never invent equipment that does not exist. Keep confidence realistic.
"""
```

### 2.3 JSON Repair & Validation
- Parse response with Pydantic `ParseNeedResponse`.
- If parsing fails, fall back to keyword extraction mode with `confidence = 0.5`.

---

## 3. Implementation Checklist

- [ ] Write regex extractors for common dimensional units (`nm`, `um`, `mm`, `W`, `V`, `rpm`).
- [ ] Implement `need_parser.py` with structured Pydantic schema validation.
- [ ] Implement fallback parser for zero-token / offline mode.
