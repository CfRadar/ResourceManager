# Step 02: Read-Only Database Repository Layer

This guide details the database access pattern ensuring the Python service acts exclusively as a read-only consumer.

---

## 1. Architectural Boundaries (Section 6.1)

> **Golden Rule:** The Python AI service has a **read-only** database user. It possesses zero `INSERT`, `UPDATE`, or `DELETE` permissions on any business tables.

### Database Credentials
- Configure `DATABASE_READONLY_URL` in `.env`:
  `postgresql://ai_readonly_user:readonly_secret@localhost:5432/resource_manager`

---

## 2. Thin Repository Pattern (`repository.py`)

Using a thin abstraction layer allows swapping database drivers without touching matching or parsing logic:

```python
import os
import psycopg2
from psycopg2.extras import RealDictCursor

class ResourceRepository:
    def __init__(self):
        self.conn_str = os.getenv("DATABASE_READONLY_URL")

    def get_connection(self):
        return psycopg2.connect(self.conn_str, cursor_factory=RealDictCursor)

    def ping(self) -> bool:
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                    return True
        except Exception:
            return False

    def get_resources_by_ids(self, resource_ids: list[str]) -> list[dict]:
        """Fetch resource details and active policies for specified IDs only."""
        if not resource_ids:
            return []
        
        query = """
            SELECT 
                r.id, r.name, r.category, r.description, r.specs, r.capabilities,
                f.name as facility_name, f.city as facility_city,
                p.policy_data
            FROM resources r
            JOIN facilities f ON r.facility_id = f.id
            LEFT JOIN resource_policies p ON p.resource_id = r.id AND p.is_current = true
            WHERE r.id = ANY(%s) AND r.status = 'ACTIVE';
        """
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (resource_ids,))
                return cur.fetchall()

    def get_incident_context(self, incident_id: str) -> dict | None:
        """Fetch incident record, associated booking, condition reports, and timeline."""
        # Query incident with condition reports and notes
        ...
```

---

## 3. In-Memory Mock Fallback

For local testing when a live database is not configured, provide a mock repository that returns sample fixture data from JSON files.

---

## 4. Implementation Checklist

- [ ] Implement `repository.py` using `psycopg2` or `asyncpg`.
- [ ] Add read-only connection verification test checking that write operations raise permission denied exceptions.
- [ ] Provide fixture dataset for offline unit tests.
