# Step 07: Incident Summary Drafting Engine (`/ai/incident-summary`)

This guide details objective incident summarization, separating verified facts from unverified claims without assigning blame.

---

## 1. Boundary & Governance Rules (Section 6.5)

1. **Draft Text Only:** Output is strictly a **draft** presented to the facility manager or coordinator for human review and edit.
2. **Never Assign Blame:** The draft must describe what physical observations are on record without legal or punitive declarations (e.g. *"Spindle overload observed at 14:15"* rather than *"User broke the spindle through carelessness"*).
3. **Mandatory Source Attribution:** Every synthesized fact must link to an underlying event ID, condition report photo ID, or user note.

---

## 2. Input Context Assembly

The endpoint takes `incidentId`, and the repository fetches:
- `Incident`: Reporter ID, type, initial description, reporter severity.
- `Booking`: Resource, start/end timestamps, actual check-in/out times.
- `Condition Reports`: `BEFORE` and `AFTER` ratings, accessory checklists, photo hashes.
- `Incident Notes`: All party statements submitted during investigation.

---

## 3. Dossier Synthesis Logic (`incidents/summarizer.py`)

The engine groups findings into four distinct sections:

### 3.1 Facts from Records (`factsFromRecords`)
Objective, verifiable log events:
- *"Booking scheduled from 10:00 to 12:00 UTC; check-in logged at 10:04 UTC."*
- *"Check-in condition report rated 5/5 with zero prior defects noted."*
- *"Return condition report rated 2/5 noting cracked focus lens."*

### 3.2 Unverified Claims (`unverifiedClaims`)
Subjective statements made in notes:
- *"Requester states the power fluctuating caused the laser tube to misfire."*
- *"Operator states the exhaust fan was switched off during operation."*

### 3.3 Missing Info (`missingInfo`)
Gaps requiring coordinator follow-up:
- *"Post-use diagnostic logs from the laser controller have not been uploaded."*
- *"Witness statement from secondary lab user has not responded."*

### 3.4 Source Tracking (`sources`)
List of event and record IDs referenced in the summary:
`["evt_1042", "rep_before_01", "rep_after_02", "note_05"]`

---

## 4. Implementation Checklist

- [ ] Write prompt template enforcing neutral, non-accusatory language.
- [ ] Implement source event ID extractor.
- [ ] Add unit test asserting no legal liability terms appear in generated summaries.
