"""Smoke tests for parsing package and stubs."""

from parsing import need_parser
from incidents import summarizer


def test_parser_stubs_import():
    """Verify parsing stubs can be imported cleanly."""
    assert hasattr(need_parser, "NeedParser")
    assert hasattr(need_parser, "parse_need_text")


def test_incident_summarizer_stubs_import():
    """Verify incident summarizer stubs can be imported cleanly."""
    assert hasattr(summarizer, "IncidentSummarizer")
    assert hasattr(summarizer, "draft_incident_summary")

