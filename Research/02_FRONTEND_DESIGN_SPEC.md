# Frontend Specification: Skeleton, Pages, Features and Workflows

**Project:** Institutional Resource Access and Coordination Network
**Stack (recommended):** React + Vite, React Router, TanStack Query (server state), Tailwind CSS, React Hook Form + Zod, a calendar component (FullCalendar or react-big-calendar), Leaflet for the optional map. Talks only to the Express API (`/api/v1`), never directly to the Python AI service.

> Every page lists: **Purpose, Roles, Skeleton, Features/Actions, Data (API), States.** Page endpoints refer to `01_BACKEND_API_SPEC.md`.

---

## 1. Design Principles

1. **Workflow first, not dashboard-card first.** Each screen answers one question: "What do I need to do next?"
2. **Status is always visible.** Every request/booking shows a status badge, who is responsible for the next step, and what the user should do.
3. **Availability is not eligibility.** Show them separately: a green "Slot free" can sit beside a red "Training missing".
4. **Explain every decision.** Approval, rejection, waitlist and incident outcomes always show a reason, the decision-maker, the time, and an appeal/next-step link.
5. **No dead buttons.** If a feature is not built, it is not shown. Demo-only features carry a visible "Demo" tag.
6. **Honest labelling.** Demo data banner, "Simulated payment", "Acknowledgment (demo)", "AI suggestion", "Keyword search (AI unavailable)".
7. **Proportional friction.** A classroom booking shows a short form; a high-risk instrument shows the full checklist. The UI renders from the resource policy, not from hard-coded forms.
8. **Accessible by default.** Keyboard navigable, visible focus, labelled inputs, colour is never the only status signal (icon + text), WCAG AA contrast, `aria-live` for toast/errors, mobile-first layout, touch targets of at least 44 px.
9. **Privacy by display.** Public pages never show access instructions, contact details, or other users' data.

---

## 2. Roles and What Each Sees

| Role | Home | Main nav |
|---|---|---|
| Visitor | Landing/Discover | Discover, Login |
| Requester | My Dashboard | Discover, Need Something Else?, My Requests, My Bookings, Notifications |
| Manager / Owner | Facility Dashboard | Review Queue, Calendar, Resources, Check-in/Returns, Incidents, Service Queue, Reports |
| Operator | Today's Work | My Assigned Services, Supervised Sessions, Training Records |
| Coordinator | Network Desk | Need Requests, Referrals, Partner Directory |
| Admin | Institution Admin | Members, Policies/Templates, Audit, Reports, Settings |

A role switcher (for judges and users with multiple roles) sits in the top bar: "Acting as: Manager at Makerspace A".

---

## 3. Global Layout Skeleton

```
+--------------------------------------------------------------------------+
| [DEMO DATA banner: "All institutions and users are fictional"]           |
+--------------------------------------------------------------------------+
| Logo | Discover | My Requests | My Bookings | [Role switcher] | Bell(3) | Avatar |
+--------------------------------------------------------------------------+
|  (optional left sidebar for Manager/Admin)  |  Page content               |
|  - Dashboard                                |  Breadcrumb                 |
|  - Review Queue (5)                         |  Title + primary action     |
|  - Calendar                                 |  ...                        |
|  - Check-in / Returns                       |                             |
|  - Incidents (1)                            |                             |
+--------------------------------------------------------------------------+
| Footer: About demo | Privacy | Limitations                               |
+--------------------------------------------------------------------------+
```
- Mobile: top bar collapses to hamburger; sidebar becomes bottom sheet; tables become stacked cards.
- Global toast area (bottom right) and a global error boundary page.

### Shared components
| Component | Used for |
|---|---|
| `StatusBadge` | Request/booking/incident states (icon + text + colour) |
| `StatusTimeline` | Vertical history of events (from audit endpoint) |
| `EligibilityChecklist` | Pass / Fail / Missing rows with action buttons |
| `PolicySummaryCard` | Human-readable policy on resource pages |
| `ResourceCard` | Search results |
| `SlotPicker` | Calendar + available slot chips |
| `FairUseMeter` | "6 of 8 hours used this week" |
| `ConditionReportForm` | Rating, notes, accessories, photos, signature |
| `SignaturePad` | Typed or drawn acknowledgment (demo label) |
| `DocumentChecklist` | Required docs with upload/sign/review status |
| `ReasonDialog` | Mandatory reason textarea for approve/reject/waitlist/resolve |
| `AiSuggestionBadge` | "AI suggestion" or "Keyword fallback" + "Why this match?" popover |
| `DemoTag` | Marks simulated features |
| `EmptyState`, `ErrorState`, `Skeleton loaders` | Consistent state handling |
| `ConfirmDialog` | Destructive/irreversible actions |
| `AuditIntegrityBadge` | "History verified" / "Integrity check failed" |

---

## 4. Route Map

```
/                              Landing + need-based search
/discover                      Search results + filters
/resources/:id                 Resource detail
/resources/:id/request         Request wizard (booking / supervised / collaboration)
/resources/:id/service         Staff-operated service request
/need                          Missing-resource (structured need) form
/login, /register, /verify     Auth
/me                            Requester dashboard
/me/requests, /me/requests/:id
/me/bookings, /me/bookings/:id
/me/bookings/:id/check-in
/me/bookings/:id/check-out
/me/services/:id
/me/incidents, /me/incidents/:id
/me/profile
/notifications
/manage                        Manager dashboard
/manage/queue                  Review queue
/manage/queue/:id              Review detail
/manage/calendar
/manage/resources, /manage/resources/new, /manage/resources/:id/edit
/manage/resources/:id/policy   Policy builder
/manage/checkin                Today's check-ins and returns
/manage/services               Service queue, /manage/services/:id
/manage/incidents, /manage/incidents/:id
/manage/training
/manage/reports
/coordinate                    Coordinator desk
/coordinate/needs/:id
/coordinate/referrals
/admin                         Admin home
/admin/members, /admin/templates, /admin/audit, /admin/settings
/history/:type/:id             Transaction history (for parties)
```
Route guards redirect unauthenticated users to `/login?next=...`; a role mismatch shows a clear "You don't have access" page (not a blank screen).

---

## 5. Pages in Detail

### 5.1 Landing and Need-based Search (`/`)
**Purpose:** Let users describe a need in plain language or browse. **Roles:** All.

```
+----------------------------------------------------------+
| Headline: "Find equipment and spaces you can safely use" |
| [ Describe what you need...                    ] [Find]  |
|   e.g. "3D printer, soldering station, oscilloscope"     |
| Quick filters: Category | City | Access mode | Free only |
+----------------------------------------------------------+
| How it works: 1 Find  2 Check eligibility  3 Request     |
|               4 Use responsibly  5 Return & history      |
+----------------------------------------------------------+
| Featured resources (cards)      | Participating institutions |
+----------------------------------------------------------+
| "Can't find it? Tell us what you need ->"                |
+----------------------------------------------------------+
```
**Features:** free-text search (calls `/ai/match-need`, fallback to `/resources?q=`), category chips, link to missing-resource form. **API:** `GET /resources`, `POST /ai/match-need`.
**States:** loading skeleton cards; empty results show "No match. Submit a need request"; AI fallback shows banner "Keyword search used".

### 5.2 Discover / Results (`/discover`)
**Skeleton:**
```
+ Filters (left) ------+ Results (right) -----------------------------+
| Category             | Parsed need chips: [3D printer] [Soldering]  |
| Institution          |   [Oscilloscope]  (editable)                 |
| Access mode          |----------------------------------------------|
| Available between    | ResourceCard                                 |
| Max cost / free      |  Photo | Name | Facility, distance           |
| Distance (km)        |  Badges: Independent / Supervised / Service  |
| Training needed?     |  Match: Available listing | AI suggestion    |
| "Only what I can     |  Cost: Free / 2 tokens/h / Quote required    |
|  request" toggle     |  Eligibility preview: "Training needed"      |
|                      |  Next free slot: Tomorrow 10:00              |
|                      |  [View details]                              |
+----------------------+----------------------------------------------+
```
**Features:**
- Group results per parsed need (one section for each item when the query listed several).
- Three explicit match labels: **Available listing**, **Potential match (needs verification)**, **Not currently available**.
- "Why this match?" popover lists the fields matched.
- Eligibility preview per card (pass / training needed / not permitted).
- Map toggle (P1).
**API:** `GET /resources`, `POST /ai/match-need`, `GET /resources/categories`.

### 5.3 Resource Detail (`/resources/:id`)
**Purpose:** Everything needed to decide whether to request. **Roles:** All (private details only after approval).

```
+----------------------------------------------------------------+
| Gallery           | Name, category, facility, institution badge|
|                   | Risk level tag | Cost model | Visibility   |
+-------------------+--------------------------------------------+
| Tabs: Overview | Specs | Access & Rules | Availability | History |
+----------------------------------------------------------------+
| [Access modes]  (Independent | Supervised | Service | Collab)  |
|   Unsupported modes appear greyed with "Not offered"            |
| [Your eligibility]  EligibilityChecklist (if logged in)         |
| [Rules] PolicySummaryCard: training, documents, limits,         |
|         prohibited uses, outside materials, cancellation, late  |
| [Availability] Week calendar: open / booked / blackout          |
| [Cost] Estimate or "Quotation required"                         |
|                                                                 |
| Sticky action bar: [Request access]  [Request a service]        |
|                    [Join waitlist]    [Ask owner (via request)] |
+----------------------------------------------------------------+
```
**Features:**
- Access mode selector changes which sections and primary button appear (independent/supervised -> request wizard; service -> service form).
- Eligibility checklist with action buttons (e.g. "Book training", "Sign safety acknowledgment").
- Availability calendar shows "Booked" with no personal data.
- Access instructions appear only in a locked card: "Visible after your booking is confirmed".
- History tab: public utilisation stats only (hours shared this month), no user data.
**API:** `GET /resources/:id`, `/availability`, `POST /resources/:id/eligibility-check`, `GET /resources/:id/private-details` (post-approval).
**States:** resource deactivated banner; blackout banner; not permitted user group message with alternatives ("Staff-operated service is available for external users").

### 5.4 Request Wizard (`/resources/:id/request`)
**Purpose:** Submit an access request for independent, supervised, or collaboration use.
**Steps rendered dynamically from the policy:**

```
Step 1  Choose access mode (only supported modes)
Step 2  Pick time (SlotPicker; shows conflicts + alternatives instantly)
Step 3  Purpose of use (required if policy says so)  + outside materials
Step 4  Requirements checklist (EligibilityChecklist + DocumentChecklist)
Step 5  Review & submit  (cost estimate, fair-use impact, rules summary)
Result  Confirmation page with request ID and what happens next
```
Progress stepper at top; "Save draft" always available.
**Features:** live eligibility check after each step, inline document upload/sign, fair-use meter ("After this you will have used 6 of 8 hours"), alternative slot chips when the selected slot is taken, explicit statement "Submitting a request does not reserve the slot."
**API:** `POST /resources/:id/eligibility-check`, `GET /resources/:id/slots`, `POST /access-requests`, `POST /documents/:id/submit`, `POST /access-requests/:id/submit`.
**Failure states:**
- Slot conflict -> inline error with 3 alternatives.
- Not eligible -> request button changes to "Submit anyway and complete requirements" only if the policy allows `AWAITING_*` states; otherwise it is disabled with the exact reasons.
- Network failure -> draft saved locally and a retry button.

### 5.5 Staff-operated Service Request (`/resources/:id/service`)
**Form:** description of work, sample/material details, desired output, deadline, purpose, budget (optional), confirmation that no prohibited materials are included. Shows "Cost: quotation required" and what the facility needs from you.
**After submit:** status page with the service timeline (see 5.12).
**API:** `POST /service-requests`.

### 5.6 Missing-Resource Request (`/need`)
**Purpose:** The referral entry point when nothing matches.
```
+---------------------------------------------------------------+
| "Tell us what you need"                                       |
| Free-text box  [Auto-fill form with AI] (optional)            |
|---------------------------------------------------------------|
| Capability or result needed          [textarea]               |
| Technical requirements (specs)       [tags/textarea]          |
| Purpose                              [textarea]               |
| Location preference / max travel km  [input][slider]          |
| Timeframe  [date range]  Duration/frequency [input]           |
| Budget (optional)                                              |
| [ ] Staff-operated service is acceptable                      |
| [ ] I allow my contact details to be shared with a receiving  |
|     institution *only if they accept the referral*            |
| [Submit need request]                                         |
+---------------------------------------------------------------+
```
**Result page:** status tracker (Submitted -> Coordinator review -> Candidate identified -> Referral sent -> Response -> Next steps). Never claims a referral is accepted until the receiver actually accepted.
**API:** `POST /ai/parse-need`, `POST /need-requests`, `GET /need-requests/mine`.

### 5.7 Requester Dashboard (`/me`)
```
+-------------------------------------------------------------+
| Action required (top, highlighted)                          |
|  - "Upload safety acknowledgment for Request #R-102"        |
|  - "Return Prusa i3 by 17:00 today"                         |
+-------------------------------------------------------------+
| Upcoming bookings (list)   | Fair-use meters + token balance |
| Pending requests (list)    | Recent notifications             |
| Open incidents             | Quick: [Find a resource] [Need]  |
+-------------------------------------------------------------+
```
**API:** `GET /dashboard/requester`.
**Empty state:** "No bookings yet. Describe what you need to get started."

### 5.8 My Requests list and Request Detail (`/me/requests`, `/me/requests/:id`)
**List:** table/cards with status badge, resource, requested time, next action, last updated. Filters by status.
**Detail skeleton:**
```
+---------------------------------------------------------------+
| Request #R-102   [StatusBadge: Awaiting documents]            |
| Resource, time, mode, purpose                                 |
+---------------------------+-----------------------------------+
| What happens next         | Requirements checklist            |
| (plain language)          | (documents/training with actions) |
+---------------------------+-----------------------------------+
| Decision box (if decided): outcome, reason, decided by, time  |
|   [Appeal this decision]  (one appeal allowed)                |
+---------------------------------------------------------------+
| Messages / info requests from the reviewer  [Reply]           |
+---------------------------------------------------------------+
| History timeline (StatusTimeline)   [Download receipt PDF]    |
+---------------------------------------------------------------+
| [Cancel request]  (shows cancellation rule before confirming) |
```
**States:** pending-approval shows who reviews it and typical response time (only if real data exists; otherwise omitted). Waitlisted shows position and a clear "You will not be booked automatically; the manager confirms when a slot opens."

### 5.9 My Bookings and Booking Detail (`/me/bookings/:id`)
- Booking card: resource, time, access instructions (unlocked), cost/tokens, rules reminder, [Reschedule] [Extend] [Cancel], [Check in] button active only in the check-in window.
- Countdown and overdue warnings.
- After return: both condition reports side by side + timeline + [Report an issue].

### 5.10 Check-in Page (`/me/bookings/:id/check-in`)
```
Step 1  Confirm identity and resource (shows equipment ID/QR text)
Step 2  Initial condition: rating (Good / Minor wear / Issue), notes,
        accessories checklist, consumables, photos (optional/required by policy)
Step 3  Acknowledge rules (short list) + signature (typed or drawn) [Demo tag]
Step 4  (Optional, if enabled) Share location for check-in verification
        with consent text; fallback "Skip" is allowed and marked "Not provided"
[Complete check-in]
```
Result: confirmation with timestamp and "In use until 17:00".
**API:** `POST /uploads/condition-photo`, `POST /bookings/:id/check-in`.
**States:** outside window shows "Check-in opens at 09:45"; upload failure keeps form data and offers retry; location denied -> proceed without it.

### 5.11 Check-out / Return Page (`/me/bookings/:id/check-out`)
Mirror of check-in. Shows the initial report on the left for comparison, final report form on the right. Accessories checklist is pre-filled from check-in. Additional "Anything to report?" toggle that opens an incident draft. After submission: "Return submitted. Waiting for staff confirmation" (status `RETURNED` pending `confirm-return`).

### 5.12 Service Tracking (`/me/services/:id`)
Horizontal stepper: Submitted -> Scope reviewed -> Quote -> Accepted -> Materials received -> In progress -> Output delivered -> Completed.
- Quote card (line items, validity, [Accept] / [Decline]) with "Demo currency" label.
- Output files download section (authorised).
- [Confirm completion] or [Dispute result] (opens incident form).

### 5.13 Incident Report (`/me/incidents/new?booking=...`) and Detail
**Form:** related booking/service, type, what happened, when, severity (your assessment), evidence upload, "I understand this report will be reviewed by the facility manager."
**Detail:** shared timeline, reviewer questions, your reply box, outcome with reason, [Appeal]. Internal notes are not shown. Language is neutral: "Reported issue", not "Damage caused by you".

### 5.14 Notifications (`/notifications`)
List grouped by day, unread highlighted, each item links to the exact page. Header bell shows the count. Empty state: "Nothing new."

### 5.15 Profile (`/me/profile`)
Name, affiliation, memberships and verification status, trainings (valid/expiring), documents on file (with expiry), usage history summary, data download/delete request (P2).

### 5.16 Auth Pages
- **Register:** name, email, password, affiliation (free text) with a note on what is collected and why.
- **Verify (demo OTP):** "Demo mode: your code is shown below" (so judges are not blocked).
- **Login:** error messages generic; lockout message after repeated failures.
- A **Judge Quick Login** panel (demo only): buttons for Requester, Manager, Coordinator, Admin using seeded credentials.

---

## 6. Manager / Owner Screens

### 6.1 Manager Dashboard (`/manage`)
```
+--------------------------------------------------------------+
| Needs attention:  5 requests to review | 2 returns to confirm |
|                   1 overdue | 1 open incident | 3 expiring docs|
+--------------------------------------------------------------+
| Today's schedule (timeline)    | Utilisation (small chart)    |
| Waitlist demand per resource   | Recent decisions              |
+--------------------------------------------------------------+
```
**API:** `GET /dashboard/manager`.

### 6.2 Review Queue (`/manage/queue`) and Review Detail (`/manage/queue/:id`)
**Queue table:** requester (name, group, verified?), resource, time, mode, eligibility summary icons (membership / training / documents / fair-use), waiting time, status.
**Review detail skeleton:**
```
+----------------------------+----------------------------------+
| Request summary            | Eligibility results (system)     |
| Purpose, materials, time   |  PASS/FAIL/MISSING list          |
|                            |  "Overridable?" flags            |
+----------------------------+----------------------------------+
| Requester background: verified membership, trainings,          |
| past bookings at this facility, no-show count, incidents       |
| (facility-scoped; viewing is logged)                           |
+---------------------------------------------------------------+
| Documents (open, approve/reject each, with reason)             |
| Conflicts: other pending requests for overlapping slots,       |
|            waitlist, alternative slots                         |
+---------------------------------------------------------------+
| Decision:  [Approve] [Request info] [Waitlist] [Reject]        |
|   -> ReasonDialog (reason mandatory, conditions optional)      |
+---------------------------------------------------------------+
| Timeline                                                       |
+---------------------------------------------------------------+
```
**Behaviour details:**
- Approve is disabled with tooltip if a hard check fails; "Override with reason" appears only for overridable checks.
- If the reviewer is the requester, the page shows "You cannot review your own request" and hides decision buttons.
- If approval hits a conflict (`409`), a panel shows alternatives to offer instead.
- Fairness panel shows the active rule used ("FIFO, first-come order" or enabled priority rule) so decisions are explainable.
**API:** `GET /facilities/:id/access-requests`, `/start-review`, `/request-info`, `/decision`, `POST /documents/:id/review`.

### 6.3 Calendar (`/manage/calendar`)
Day/week/month calendar by resource. Colour by status plus text. Click an event opens booking detail drawer (user, status, check-in state). [Add blackout] opens a modal showing affected bookings before confirming.

### 6.4 Check-in / Returns Desk (`/manage/checkin`)
Two columns: "Arriving today" and "Due back today". Each row: user, resource, time, status, buttons [Assist check-in], [Confirm return], [Flag issue], [Mark no-show] (appears after the grace period). Overdue items are pinned to the top. [Confirm return] shows the before/after comparison and diff highlights.

### 6.5 Resource Management (`/manage/resources`, `/new`, `/:id/edit`)
**List:** resources with status, visibility, bookings this week.
**Create/Edit (tabs):** Basics (name, category, description, specs, tags) | Photos | Visibility & user groups | Access modes | Pricing | Availability and working hours | Policy (6.6).
Changes show a diff before saving, and saving records an audit event.
[Deactivate] with confirmation (explains what happens to existing bookings).

### 6.6 Policy Builder (`/manage/resources/:id/policy`)
A form that edits the policy JSON with plain-language labels:
```
Access modes offered:   [x] Independent  [x] Supervised  [ ] Service [ ] Collaboration
Who may request:        [x] Students  [x] Staff  [x] Partner institutions  [ ] External commercial  [ ] Public
Approval required:      (o) Always  ( ) Only for external users  ( ) Auto-confirm if all checks pass
Purpose statement:      [x] Required
Training required:      [Select trainings...]
Documents required:     [Select templates...]
Supervision required for: [External commercial v]
Outside materials:      ( ) Not allowed  (o) Needs approval  ( ) Allowed
Limits:   Max active bookings [2]  Hours per week [8]  Max booking length [4h]  Book up to [21] days ahead
Cancellation: free until [12] h before; no-show strikes [3]
Late return grace [15] min
Pricing:  ( ) Free  ( ) Hourly  ( ) Cost recovery  ( ) Quote  ( ) Tokens   [rate]
Check-in: [x] Before photo optional  [ ] Geofence soft check
Prohibited uses: [list]
Priority rules (only if your institution defines them): [add rule + required proof]
Preview: "What a requester sees" (live PolicySummaryCard)
```
Risk presets (Low: classroom, Medium: 3D printer, High: scientific instrument) pre-fill sensible defaults, which the owner may change.

### 6.7 Service Queue (`/manage/services`, `/:id`)
Queue of service requests. Detail page actions follow the lifecycle: [Mark feasible / Not feasible] -> [Create quote] (line-item editor) -> [Record materials received] -> [Post progress update] -> [Upload output] -> status complete. Operator-only actions are visible to Operator/Manager.

### 6.8 Incident Management (`/manage/incidents`, `/:id`)
**Queue:** severity (reporter-selected, labelled so), type, status, age.
**Detail skeleton:**
```
+---------------------------------+--------------------------------+
| Report (reporter, time, text)   | Evidence: photos, before/after |
|                                 | condition reports side by side |
+---------------------------------+--------------------------------+
| Other party's response          | Timeline                       |
+---------------------------------+--------------------------------+
| Internal notes (not visible to parties)                          |
| [Request info] [Draft summary (AI)] [Resolve] [Dismiss]          |
+------------------------------------------------------------------+
```
Resolve dialog: outcome, findings, recommended remedy (recorded only), mandatory reason. Banner: "No penalty is applied automatically. Rulings are recorded here." AI draft shows with a "Draft, review before use" label and lists source facts vs unverified claims.

### 6.9 Training and Documents (`/manage/training`)
Pending verifications list; record training completion; set expiry; review uploaded certificates. Uses `ReasonDialog` for rejections.

### 6.10 Reports (`/manage/reports`)
Utilisation chart per resource, demand/unmet demand, no-show rate, incident counts. Buttons: [Export bookings XLSX], [Export usage report]. Date range filter.

---

## 7. Coordinator Screens

### 7.1 Network Desk (`/coordinate`)
Open need requests (queue), referral statuses, partner institution list with response time.

### 7.2 Need Request Review (`/coordinate/needs/:id`)
```
+-------------------------------+--------------------------------+
| Structured need (as submitted)| Candidate matches              |
| purpose, specs, location,     |  (AI or keyword, labelled)     |
| timeframe, budget, consent    |  Each: facility, matchType,    |
|                               |  reasons, [Add as candidate]   |
+-------------------------------+--------------------------------+
| Referral composer: choose receiving institution/facility       |
| Message to receiver (preview of exactly what is shared)        |
| Contact sharing: OFF unless the requester consented            |
| [Send referral]                                                |
+----------------------------------------------------------------+
| Referral timeline: Sent -> Accepted/Declined/No response       |
| [Try another candidate] [Close: resolved / unresolved]         |
+----------------------------------------------------------------+
```
### 7.3 Referral Inbox (receiving institution users, `/coordinate/referrals`)
List incoming referrals with limited detail; [Accept with next steps] / [Decline with reason]. Only the receiving side can click Accept.

---

## 8. Admin Screens

| Page | Features |
|---|---|
| `/admin` | Counts, integrity badge (hash-chain verified), recent audit events |
| `/admin/members` | Membership requests (approve/reject with reason), role changes, suspensions |
| `/admin/templates` | Document/acknowledgment templates (text written by the institution; "legal review done" checkbox + reviewer name; the platform states it supplies no legal terms) |
| `/admin/audit` | Filter by actor/action/date/resource, [Verify integrity], export CSV; internal vs shared events flagged |
| `/admin/settings` | Defaults (retention period, reminder timings, token monthly allowance), partner institutions |

---

## 9. Transaction History View (`/history/:type/:id`)
Used by both parties and managers (filtered by role).
```
Header: Entity, parties, resource, final status, [Download PDF receipt]
Timeline (newest at bottom): time | actor (role) | action | reason
 - Condition reports (before/after) expandable
 - Documents and acknowledgments (names and status, not contents)
 - Decision explanations
 - Incident entries (shared ones only for requester)
Footer: AuditIntegrityBadge "History verified" or warning
```
Corrections appear as additional entries marked "Note added", never as edits.

---

## 10. End-to-End Workflows (screen sequence)

### 10.1 Independent use (main judge journey)
1. **Manager** creates resource and policy (`/manage/resources/new` -> Policy Builder). *(Pre-seeded for judges, but the screen works.)*
2. **Requester** searches "3D printer for robotics project" (`/` -> `/discover`) and sees AI suggestion with reasons.
3. Opens resource detail; the eligibility checklist shows "Training missing".
4. Completes training request / uses seeded verified training; signs safety acknowledgment (demo).
5. Request wizard: picks slot, writes purpose, submits. Status: **Submitted**.
6. **Manager** opens Review Queue -> Review Detail -> sees all checks, approves with a reason. Slot becomes **Scheduled**.
7. Requester gets a notification, sees the access instructions unlock on booking detail.
8. At the start time: Check-in with condition report + signature. Status **In use**.
9. Check-out with final condition report. Status **Returned**.
10. **Manager** confirms return in the Check-in/Returns Desk. Status **Closed**. Tokens settled.
11. Both open `/history/booking/:id` and download the receipt; integrity badge shows verified.

### 10.2 Failure paths (demonstrate in the UI)
- **Ineligible user:** external requester sees "Not permitted for direct use. Staff-operated service is available" with a button to the service form.
- **Missing training/document:** wizard shows exact missing item with an action button; request enters `AWAITING_*`.
- **Slot conflict:** two requesters pick the same slot; the second approval attempt returns conflict and the UI shows alternatives.
- **Waitlist:** manager waitlists; requester sees position and the explanation; when the first booking is cancelled the manager receives an "offer slot" prompt.
- **Fair-use limit:** user at 8 of 8 hours sees the blocking message and reset time.
- **Rejection + appeal:** reason visible; requester files an appeal; a different reviewer or admin handles it.
- **Self-approval attempt:** a manager who also made a request sees decision buttons hidden.

### 10.3 Supervised use
Same as 10.1, but the wizard adds "Operator will be present", the booking is only confirmable when an operator is assigned (manager picks an operator at approval), and check-in includes the operator's co-acknowledgment.

### 10.4 Staff-operated service
Requester submits (5.5) -> Manager scope review -> Quote (line items) -> Requester accepts -> Operator records materials received -> posts progress -> uploads output -> Requester confirms completion -> Closed. Timeline visible to both.

### 10.5 Missing-resource referral
Requester searches, nothing matches -> `/need` -> Coordinator reviews candidates -> sends referral (no contact details shared) -> receiving institution accepts with next steps -> requester sees next steps -> Coordinator closes. Every step in the shared history.

### 10.6 Incident
During or after return, either party clicks [Report an issue] -> evidence -> Manager reviews both condition reports -> asks for the other side's response -> resolves with reasons -> either party may appeal -> history keeps everything.

### 10.7 Overdue
Scheduler flags overdue -> user receives reminder; manager sees a pinned overdue row -> [Extend] or [Open incident]. No automatic penalty.

---

## 11. State Handling Matrix (apply on every data-driven page)

| State | Behaviour |
|---|---|
| Loading | Skeleton placeholders, not spinners only; buttons show a busy state |
| Empty | Short explanation + next action button |
| Error (network/server) | Inline error with Retry; never a fake success |
| 401 | Redirect to login, preserve `next` |
| 403 / `NOT_ELIGIBLE` | Show exact reasons and next steps |
| 404 | "Not found or you don't have access" |
| 409 conflict | Show alternatives (slots) or the current state, offer refresh |
| Pending approval | Banner with who reviews and what the requester can do meanwhile |
| Offline/slow | Draft preserved in local component state; user informed |
| AI unavailable | Banner "Keyword search used"; all functionality continues |

Use optimistic UI only for harmless actions (mark notification read). Approval, booking and check-in wait for server confirmation.

---

## 12. Visual Style Guidance
- Neutral, trustworthy palette (deep blue or teal primary, warm neutral background) with status colours: green (approved/available), amber (pending/waiting), red (rejected/overdue/incident), grey (closed/cancelled), blue (in use). Always paired with icons and text.
- Typography: one clear sans-serif; large readable body size (16 px minimum).
- Dense data tables only for manager/admin screens; requester screens use roomy cards and short sentences.
- Plain-language microcopy. Example: "Your request is waiting for Dr. Rao to review. You'll be notified here."
- Persistent small tags: **Demo**, **AI suggestion**, **Simulated payment**.

---

## 13. Accessibility and Inclusion Checklist
- All interactive elements reachable by keyboard; visible focus rings; skip-to-content link.
- Form fields have labels and error text linked with `aria-describedby`.
- Calendars have a list view alternative.
- Status uses text + icon; charts have text summaries.
- Respect `prefers-reduced-motion` and `prefers-color-scheme` (light/dark tokens).
- Avoid time-limited interactions; allow draft saving.
- Optional accessibility-needs field in the request (visible to the reviewer only if the institution defines accessibility priority rules).
- Language: simple English first; structure strings in an i18n file so Hindi can be added later.

---

## 14. Frontend Folder Structure
```
src/
  app/            router, providers, guards
  api/            axios client, query hooks per module
  components/     shared components (section 3)
  features/
    discovery/  resources/  requests/  bookings/  checkin/
    services/   needs/      incidents/ notifications/
    manage/     coordinate/ admin/     history/  auth/
  hooks/          useAuth, useRole, useToast
  lib/            formatters, statusMaps, policy->text helpers
  styles/
  tests/          component + e2e (Playwright) for the main journey
```

---

## 15. Build Priority

**P0:** Landing + search (AI with fallback), Discover, Resource detail with eligibility checklist, Request wizard, Requester dashboard, My requests + detail, Booking detail, Check-in/Check-out with condition reports and signature, Manager dashboard, Review queue/detail with decisions, Returns desk, Incident report + manager resolution, History view, Notifications, Auth with Judge Quick Login, Demo banner.

**P1:** Policy builder (full), Calendar with blackouts, Service request flow, Need request + Coordinator desk + referrals, Documents/training review pages, Reports + exports, Admin members/audit pages, Map view, Availability polls UI.

**P2:** Profile data export/delete, i18n (Hindi), calendar sync, advanced analytics, mobile PWA features.

## 16. Frontend Testing and Demo Readiness
- Playwright test: the full 10.1 journey with seeded accounts, plus two failure paths (conflict, ineligible).
- Component tests for `EligibilityChecklist`, `StatusBadge`, `ReasonDialog`.
- Manual accessibility pass (keyboard-only walk-through, contrast check).
- Seed script creates: 2-3 fictional institutions, 6-8 resources of varying risk, one user per role, one pre-filled history so dashboards are not empty, and one pending request ready for the judge to approve.
- Judge Quick Login panel and a visible "Reset demo data" button (demo mode only).
