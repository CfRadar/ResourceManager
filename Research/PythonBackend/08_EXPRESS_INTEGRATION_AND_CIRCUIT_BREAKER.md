# Step 08: Express Integration, Circuit Breaker & Fallback Handling

This guide details how the Express Node.js backend communicates with the Python FastAPI service, enforces timeouts, and manages graceful degradation.

---

## 1. Network Topology & Proxy Role (Section 4.24)

```
[React Frontend]
       │
       │ (1. POST /api/v1/ai/match-need)
       ▼
[Express Backend API (Port 5000)]
       │
       ├─► Evaluates user auth & computes visibleResourceIds
       │
       │ (2. POST http://localhost:8000/ai/match-need with X-Internal-Key)
       ▼
[Python FastAPI AI Service (Port 8000)]
```

> **Rule:** The frontend **never calls Python directly**. All AI requests pass through Express so that authentication, visibility constraints, rate limits, and audit logs are enforced in one place.

---

## 2. Express HTTP Proxy Client (`src/modules/aiProxy/client.js`)

```javascript
import axios from 'axios';
import { Errors } from '../../middleware/errorHandler.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'dev-secret-internal-key';

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 4000, // Strict 4-second timeout threshold (Section 6.4)
  headers: {
    'X-Internal-Key': INTERNAL_KEY
  }
});

export async function proxyMatchNeed(text, visibleResourceIds, userId) {
  try {
    const res = await aiClient.post('/ai/match-need', {
      text,
      visibleResourceIds
    }, {
      headers: { 'X-User-Id': userId }
    });
    return res.data;
  } catch (err) {
    console.warn(`[AI Proxy] Call to Python service failed or timed out: ${err.message}`);
    // Execute Node-side fallback (or return keyword fallback response)
    return executeNodeKeywordFallback(text, visibleResourceIds);
  }
}
```

---

## 3. Failure Modes & Mitigations (Section 6.4)

| Failure Scenario | Mitigation |
|---|---|
| Python service down or unresponsive (> 4s) | Express catches timeout and triggers keyword fallback with `source: 'KEYWORD_FALLBACK'`. UI displays *"Keyword search (AI unavailable)"*. |
| Model outputs invalid JSON | FastAPI Pydantic schema validation returns 422; Express catches and falls back to deterministic matcher. |
| Hallucinated Resource ID returned | Express validates every returned ID against `visibleResourceIds` and the active DB, stripping any invalid IDs before sending to client. |
| Empty matches found | Express returns empty matches array and provides UI link to submit a missing-resource `NeedRequest`. |

---

## 4. Implementation Checklist

- [ ] Configure `axios` with 4000ms timeout.
- [ ] Implement Node-side fallback query in `src/modules/aiProxy/fallback.js`.
- [ ] Write integration test verifying that killing the Python process does not crash the Express `/ai/match-need` route.
