"""Read-only database query layer for UviAge.

Architectural Rule (Spec §6.1):
The Python AI service acts strictly as a read-only consumer.
Zero INSERT, UPDATE, or DELETE permissions exist on any business tables.
Provides graceful in-memory fixture fallback when database connectivity is unavailable.
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from config import get_settings

logger = logging.getLogger("uviage.repository")

FIXTURES_DIR = Path(__file__).parent / "fixtures"
MUTATING_SQL_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE)\b",
    re.IGNORECASE,
)


class ReadOnlyRepository:
    """Read-only query repository layer.

    Strictly read-only: any mutating statement raises PermissionError.
    """

    def __init__(self, db_url: Optional[str] = None) -> None:
        self._db_url = db_url
        self._cached_resources: Optional[List[Dict[str, Any]]] = None
        self._cached_incidents: Optional[List[Dict[str, Any]]] = None

    @property
    def db_url(self) -> Optional[str]:
        """Resolve database URL from explicit parameter, environment, or settings."""
        if self._db_url:
            return self._db_url
        return os.getenv("DATABASE_READONLY_URL") or get_settings().DATABASE_URL

    def _assert_read_only(self, sql: str) -> None:
        """Validate query does not contain mutating commands."""
        match = MUTATING_SQL_PATTERN.search(sql)
        if match:
            forbidden = match.group(0).upper()
            raise PermissionError(
                f"ReadOnlyRepository prohibits mutating operation '{forbidden}'. "
                "The AI service has zero write permissions."
            )

    def ping(self) -> Union[str, bool]:
        """Check database connectivity safely.

        Returns:
            - True if connection and SELECT 1 succeed
            - "not_configured" if no database URL is set
            - "disconnected" if connection fails
        """
        url = self.db_url
        if not url:
            return "not_configured"

        try:
            import psycopg
            from psycopg.rows import dict_row

            self._assert_read_only("SELECT 1;")
            with psycopg.connect(url, connect_timeout=3, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1 as alive;")
                    res = cur.fetchone()
                    return bool(res and res.get("alive") == 1)
        except PermissionError:
            raise
        except Exception as exc:
            logger.warning("Database ping safely detected offline status: %s", exc)
            return "disconnected"

    # ==========================================================================
    # Fixture Loaders for Offline / Local Testing
    # ==========================================================================

    def _load_fixture_resources(self) -> List[Dict[str, Any]]:
        """Load fallback sample resources from fixtures directory."""
        if self._cached_resources is None:
            fixture_path = FIXTURES_DIR / "sample_resources.json"
            if fixture_path.exists():
                with open(fixture_path, "r", encoding="utf-8") as f:
                    self._cached_resources = json.load(f)
            else:
                self._cached_resources = []
        return self._cached_resources

    def _load_fixture_incidents(self) -> List[Dict[str, Any]]:
        """Load fallback sample incidents from fixtures directory."""
        if self._cached_incidents is None:
            fixture_path = FIXTURES_DIR / "sample_incidents.json"
            if fixture_path.exists():
                with open(fixture_path, "r", encoding="utf-8") as f:
                    self._cached_incidents = json.load(f)
            else:
                self._cached_incidents = []
        return self._cached_incidents

    # ==========================================================================
    # Read-Only Resource Queries
    # ==========================================================================

    def get_resources_by_ids(self, resource_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch resource details and active policies for specified IDs only.

        Security Constraint: Only returns listings that match the provided IDs
        authorized by Express.
        """
        if not resource_ids:
            return []

        url = self.db_url
        if url:
            try:
                import psycopg
                from psycopg.rows import dict_row

                query = """
                    SELECT 
                        r.id, r.name, r.category, r.description, r.specs, r.capabilities,
                        r.visibility, r.risk_level, r.status,
                        f.id as facility_id, f.name as facility_name, f.timezone,
                        i.id as institution_id, i.name as institution_name, i.city as facility_city,
                        p.policy_data
                    FROM resources r
                    JOIN facilities f ON r.facility_id = f.id
                    JOIN institutions i ON f.institution_id = i.id
                    LEFT JOIN resource_policies p ON p.resource_id = r.id AND p.is_current = true
                    WHERE r.id = ANY(%s) AND r.status = 'ACTIVE';
                """
                self._assert_read_only(query)

                with psycopg.connect(url, connect_timeout=3, row_factory=dict_row) as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, (resource_ids,))
                        rows = cur.fetchall()
                        return [dict(row) for row in rows]
            except PermissionError:
                raise
            except Exception as exc:
                logger.warning("DB query failed, falling back to fixtures: %s", exc)

        # Fallback to fixture data for offline execution
        fixtures = self._load_fixture_resources()
        target_ids = set(resource_ids)
        return [
            dict(item)
            for item in fixtures
            if item.get("id") in target_ids and item.get("status") == "ACTIVE"
        ]

    def get_all_active_resources(self) -> List[Dict[str, Any]]:
        """Fetch all active resource listings with current policies for vector indexing."""
        url = self.db_url
        if url:
            try:
                import psycopg
                from psycopg.rows import dict_row

                query = """
                    SELECT 
                        r.id, r.name, r.category, r.description, r.specs, r.capabilities,
                        r.visibility, r.risk_level, r.status,
                        f.id as facility_id, f.name as facility_name, f.timezone,
                        i.id as institution_id, i.name as institution_name, i.city as facility_city,
                        p.policy_data
                    FROM resources r
                    JOIN facilities f ON r.facility_id = f.id
                    JOIN institutions i ON f.institution_id = i.id
                    LEFT JOIN resource_policies p ON p.resource_id = r.id AND p.is_current = true
                    WHERE r.status = 'ACTIVE';
                """
                self._assert_read_only(query)

                with psycopg.connect(url, connect_timeout=3, row_factory=dict_row) as conn:
                    with conn.cursor() as cur:
                        cur.execute(query)
                        rows = cur.fetchall()
                        return [dict(row) for row in rows]
            except PermissionError:
                raise
            except Exception as exc:
                logger.warning("DB query failed, falling back to fixtures: %s", exc)

        fixtures = self._load_fixture_resources()
        return [dict(item) for item in fixtures if item.get("status") == "ACTIVE"]

    # ==========================================================================
    # Read-Only Incident Dossier Queries
    # ==========================================================================

    def get_incident_context(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Fetch full incident dossier context: incident details, booking, and condition reports."""
        if not incident_id:
            return None

        url = self.db_url
        if url:
            try:
                import psycopg
                from psycopg.rows import dict_row

                query = """
                    SELECT 
                        inc.id, inc.booking_id, inc.reporter_id, inc.type,
                        inc.description, inc.severity_by_reporter, inc.status, inc.occurred_at
                    FROM incidents inc
                    WHERE inc.id = %s;
                """
                self._assert_read_only(query)

                with psycopg.connect(url, connect_timeout=3, row_factory=dict_row) as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, (incident_id,))
                        incident = cur.fetchone()
                        if not incident:
                            return None

                        context = dict(incident)

                        # Fetch condition reports if booking exists
                        booking_id = incident.get("booking_id")
                        if booking_id:
                            cr_query = """
                                SELECT id, kind, rating, notes, accessories, photo_ids, geo_status, submitted_at
                                FROM condition_reports
                                WHERE booking_id = %s;
                            """
                            self._assert_read_only(cr_query)
                            cur.execute(cr_query, (booking_id,))
                            context["condition_reports"] = [dict(cr) for cr in cur.fetchall()]

                        return context
            except PermissionError:
                raise
            except Exception as exc:
                logger.warning("DB incident query failed, falling back to fixtures: %s", exc)

        fixtures = self._load_fixture_incidents()
        for inc in fixtures:
            if inc.get("id") == incident_id:
                return dict(inc)
        return None


# Module singleton instance
repository = ReadOnlyRepository()


def ping() -> Union[str, bool]:
    """Module-level ping helper."""
    return repository.ping()
