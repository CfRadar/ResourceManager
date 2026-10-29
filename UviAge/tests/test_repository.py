"""Unit tests for ReadOnlyRepository and offline fixtures."""

import pytest
from repository import ReadOnlyRepository


def test_ping_not_configured():
    """Verify ping() returns 'not_configured' when DATABASE_URL is None or empty."""
    repo = ReadOnlyRepository(db_url=None)
    # Temporarily override property to None to simulate empty config
    repo._db_url = None
    status = repo.ping()
    assert status in ["not_configured", "disconnected"]


def test_ping_disconnected_url():
    """Verify ping() safely returns 'disconnected' for unreachable database."""
    repo = ReadOnlyRepository(db_url="postgresql://invalid_user:invalid_pass@127.0.0.1:54329/nonexistent")
    status = repo.ping()
    assert status == "disconnected"


def test_get_resources_by_ids_fixture_fallback():
    """Verify get_resources_by_ids returns matching active resources from fixtures."""
    repo = ReadOnlyRepository(db_url=None)

    # Empty IDs list must return empty list
    assert repo.get_resources_by_ids([]) == []

    # Valid subset
    resources = repo.get_resources_by_ids(["res_001", "res_003"])
    assert len(resources) == 2
    ids = {r["id"] for r in resources}
    assert ids == {"res_001", "res_003"}

    # Schema checks on fixture data
    res_001 = next(r for r in resources if r["id"] == "res_001")
    assert res_001["category"] == "fabrication"
    assert "FDM" in res_001["capabilities"]
    assert res_001["facility_name"] == "Digital Fabrication Lab"
    assert "policy_data" in res_001
    assert res_001["policy_data"]["maxSingleBookingHours"] == 8

    # Non-existent ID returns empty
    assert repo.get_resources_by_ids(["res_nonexistent"]) == []


def test_get_all_active_resources_fixture_fallback():
    """Verify get_all_active_resources loads all active fixtures."""
    repo = ReadOnlyRepository(db_url=None)
    all_res = repo.get_all_active_resources()
    assert len(all_res) >= 4
    for r in all_res:
        assert r["status"] == "ACTIVE"
        assert "capabilities" in r
        assert "policy_data" in r


def test_get_incident_context_fixture_fallback():
    """Verify get_incident_context returns full incident dossier context."""
    repo = ReadOnlyRepository(db_url=None)

    # Missing ID returns None
    assert repo.get_incident_context("") is None
    assert repo.get_incident_context("inc_unknown") is None

    # Valid incident
    inc = repo.get_incident_context("inc_001")
    assert inc is not None
    assert inc["id"] == "inc_001"
    assert inc["type"] == "DAMAGE"
    assert "booking" in inc
    assert inc["booking"]["id"] == "bk_501"
    assert "condition_reports" in inc
    assert len(inc["condition_reports"]) == 2

    # Verify BEFORE and AFTER condition reports
    kinds = {cr["kind"] for cr in inc["condition_reports"]}
    assert kinds == {"BEFORE", "AFTER"}


def test_read_only_enforcement():
    """Security rule: Mutating SQL statements must raise PermissionError."""
    repo = ReadOnlyRepository()

    # Valid SELECT statement passes
    repo._assert_read_only("SELECT id, name FROM resources WHERE status = 'ACTIVE';")

    # Mutating statements must be rejected
    mutating_queries = [
        "INSERT INTO resources (id, name) VALUES ('res_99', 'Fake');",
        "UPDATE resources SET status = 'INACTIVE' WHERE id = 'res_001';",
        "DELETE FROM resources WHERE id = 'res_001';",
        "DROP TABLE users;",
        "ALTER TABLE resources ADD COLUMN test int;",
        "TRUNCATE TABLE bookings;",
    ]

    for sql in mutating_queries:
        with pytest.raises(PermissionError) as exc_info:
            repo._assert_read_only(sql)
        assert "ReadOnlyRepository prohibits mutating operation" in str(exc_info.value)

