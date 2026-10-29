"""Objective incident dossier summarization engine.

Spec §4.16 & §6.5 (Step 07).
Synthesizes factual timelines, condition report diffs, and party claims
without assigning blame, liability, or legal fault.
Mandatory rule: All outputs are strictly draft summaries for human coordinator review.
"""

import re
from typing import Any, Dict, List, Optional, Set

FORBIDDEN_FAULT_TERMS = re.compile(
    r"\b(guilty|liable|at fault|negligent|negligence|careless|carelessness|blame|breach|culpable)\b",
    re.IGNORECASE,
)


def sanitize_neutral(text: str) -> str:
    """Ensure text does not contain accusatory legal liability or fault terminology."""
    return FORBIDDEN_FAULT_TERMS.sub("[contested observation]", text)


class IncidentSummarizer:
    """Dossier synthesis engine separating verified logs from unverified party statements."""

    def __init__(self) -> None:
        pass

    def summarize(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize an objective incident summary from dossier records.

        Args:
            context: Dictionary holding incident details, booking, condition_reports, and notes.

        Returns:
            Dictionary matching IncidentSummaryResponse schema.
        """
        incident_id = context.get("id") or context.get("incident_id") or "UNKNOWN"
        inc_type = str(context.get("type") or "INCIDENT").upper()
        severity = str(context.get("severity_by_reporter") or "MEDIUM").upper()
        occurred_at = context.get("occurred_at") or "unspecified time"
        reporter_desc = context.get("description") or ""

        booking = context.get("booking") or {}
        booking_id = booking.get("id") or context.get("booking_id")
        resource_name = booking.get("resource_name") or "Equipment"
        booking_status = booking.get("status") or "RECORDED"

        condition_reports = context.get("condition_reports") or []
        notes = context.get("notes") or []

        facts_from_records: List[str] = []
        unverified_claims: List[str] = []
        missing_info: List[str] = []
        sources: Set[str] = set()

        if incident_id != "UNKNOWN":
            sources.add(incident_id)
        if booking_id:
            sources.add(booking_id)

        # 1. Facts from Booking Logs
        start_at = booking.get("start_at")
        end_at = booking.get("end_at")
        if start_at and end_at:
            facts_from_records.append(
                f"Booking for {resource_name} scheduled from {start_at} to {end_at} (status: {booking_status})."
            )

        # 2. Facts from Condition Reports
        before_cr = next((cr for cr in condition_reports if str(cr.get("kind")).upper() == "BEFORE"), None)
        after_cr = next((cr for cr in condition_reports if str(cr.get("kind")).upper() == "AFTER"), None)

        if before_cr:
            sources.add(str(before_cr.get("id") or "cr_before"))
            rating = before_cr.get("rating", "N/A")
            notes_text = before_cr.get("notes") or "no defects noted"
            geo = before_cr.get("geo_status")
            geo_str = f" [geofence: {geo}]" if geo else ""
            facts_from_records.append(
                f"Check-in (BEFORE) condition report rated {rating}/5: '{notes_text}'{geo_str}."
            )
            for pid in (before_cr.get("photo_ids") or []):
                sources.add(pid)
        else:
            missing_info.append("Check-in (BEFORE) condition report is missing from the booking record.")

        if after_cr:
            sources.add(str(after_cr.get("id") or "cr_after"))
            rating = after_cr.get("rating", "N/A")
            notes_text = after_cr.get("notes") or "no return notes"
            geo = after_cr.get("geo_status")
            geo_str = f" [geofence: {geo}]" if geo else ""
            facts_from_records.append(
                f"Check-out (AFTER) condition report rated {rating}/5: '{notes_text}'{geo_str}."
            )
            photos = after_cr.get("photo_ids") or []
            for pid in photos:
                sources.add(pid)
            if not photos:
                missing_info.append("Return condition report does not have attached photographic evidence.")

            # Check accessory condition differences
            if before_cr:
                before_acc = {a.get("name"): a.get("condition") for a in (before_cr.get("accessories") or [])}
                after_acc = {a.get("name"): a.get("condition") for a in (after_cr.get("accessories") or [])}
                for name, a_cond in after_acc.items():
                    b_cond = before_acc.get(name)
                    if b_cond and b_cond != a_cond:
                        facts_from_records.append(
                            f"Accessory '{name}' condition changed from {b_cond} at check-in to {a_cond} at return."
                        )
        else:
            missing_info.append("Post-use (AFTER) condition report has not yet been submitted.")

        # 3. Unverified Claims from Reporter Description and Notes
        if reporter_desc:
            clean_desc = sanitize_neutral(reporter_desc)
            unverified_claims.append(f"Reporter statement: \"{clean_desc}\"")

        party_roles: Set[str] = set()
        for idx, n in enumerate(notes):
            author = n.get("author") or n.get("author_id") or f"note_author_{idx+1}"
            role = str(n.get("role") or "PARTY").upper()
            party_roles.add(role)
            text = sanitize_neutral(n.get("text") or n.get("content") or "")
            note_id = n.get("id") or f"note_{idx+1}"
            sources.add(str(note_id))
            unverified_claims.append(f"{role} ({author}) states: \"{text}\"")

        # 4. Evidential Gap Analysis
        if "REQUESTER" in party_roles and "MANAGER" not in party_roles:
            missing_info.append("Facility staff or manager inspection statement is pending.")
        elif "MANAGER" in party_roles and "REQUESTER" not in party_roles:
            missing_info.append("Requester statement or explanation has not been submitted.")
        elif len(party_roles) == 0 and not reporter_desc:
            missing_info.append("No written statements submitted by parties.")

        # 5. Synthesize Objective Narrative Summary
        timeline_intro = (
            f"Incident [{inc_type}] (Severity: {severity}) filed for {resource_name} regarding events "
            f"reported at {occurred_at}."
        )

        condition_narrative = ""
        if before_cr and after_cr:
            b_rating = before_cr.get("rating", "N/A")
            a_rating = after_cr.get("rating", "N/A")
            condition_narrative = (
                f" Recorded condition rating transitioned from {b_rating}/5 at check-in to {a_rating}/5 upon return."
            )

        claims_narrative = ""
        if unverified_claims:
            claims_narrative = f" The record contains {len(unverified_claims)} party statement(s) regarding operating parameters and observations."

        gaps_narrative = ""
        if missing_info:
            gaps_narrative = f" Notable evidentiary gap(s): {'; '.join(missing_info)}."

        raw_summary = (
            f"{timeline_intro}{condition_narrative}{claims_narrative}{gaps_narrative} "
            f"Presented for impartial coordinator review without presumption of fault."
        ).strip()

        final_summary = sanitize_neutral(raw_summary)

        return {
            "ok": True,
            "summary": final_summary,
            "factsFromRecords": facts_from_records,
            "unverifiedClaims": unverified_claims,
            "missingInfo": missing_info,
            "sources": sorted(list(sources)),
            "disclaimer": "Draft summary for coordinator review. Does not assign fault or liability.",
        }


# Singleton engine instance
summarizer = IncidentSummarizer()


def draft_incident_summary(context: Dict[str, Any]) -> Dict[str, Any]:
    """Helper function to draft an objective incident summary."""
    return summarizer.summarize(context)
