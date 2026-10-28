# React Frontend Implementation Guides

This directory contains modular, step-by-step implementation blueprints for building the entire React + TypeScript + Vite frontend client according to [Research/02_FRONTEND_DESIGN_SPEC.md](../02_FRONTEND_DESIGN_SPEC.md).

---

## Guide Index

| Step | File | Core Topics Covered |
|---|---|---|
| **00** | [00_ARCHITECTURE_ROUTING_AND_PROVIDERS.md](./00_ARCHITECTURE_ROUTING_AND_PROVIDERS.md) | Vite + React 19 structure, TanStack Query, Axios client, Router route map, Role Guards, and the Role Switcher |
| **01** | [01_DESIGN_SYSTEM_AND_SHARED_COMPONENTS.md](./01_DESIGN_SYSTEM_AND_SHARED_COMPONENTS.md) | Accessible design tokens, typography, WCAG AA compliance, and shared component primitives (`StatusBadge`, `ReasonDialog`, etc.) |
| **02** | [02_AUTHENTICATION_AND_JUDGE_LOGIN.md](./02_AUTHENTICATION_AND_JUDGE_LOGIN.md) | Auth forms, demo OTP verification screen, and the floating **Judge Quick Login** toolbar for 1-click role testing |
| **03** | [03_LANDING_AND_AI_DISCOVERY.md](./03_LANDING_AND_AI_DISCOVERY.md) | Homepage (`/`), natural language search box (`/ai/match-need`), keyword fallback notice, and `/discover` filters & cards |
| **04** | [04_RESOURCE_DETAIL_AND_ELIGIBILITY_CHECK.md](./04_RESOURCE_DETAIL_AND_ELIGIBILITY_CHECK.md) | Detailed catalog page (`/resources/:id`), tabbed views, `EligibilityChecklist`, policy summary, and locked access instructions |
| **05** | [05_DYNAMIC_REQUEST_WIZARD.md](./05_DYNAMIC_REQUEST_WIZARD.md) | Policy-driven 5-step wizard (`/resources/:id/request`): mode, `SlotPicker`, purpose statement, document signing, and fair-use meter |
| **06** | [06_REQUESTER_DASHBOARD_AND_BOOKINGS.md](./06_REQUESTER_DASHBOARD_AND_BOOKINGS.md) | User dashboard (`/me`), action-required cards, request detail with appeal dialog, booking details with live countdown |
| **07** | [07_CHECKIN_CHECKOUT_AND_SIGNATURE_PAD.md](./07_CHECKIN_CHECKOUT_AND_SIGNATURE_PAD.md) | Physical check-in and checkout wizards, 5-star rating, accessory checklists, photo uploads, `SignaturePad`, and GPS soft check |
| **08** | [08_MANAGER_DASHBOARD_AND_REVIEW_QUEUE.md](./08_MANAGER_DASHBOARD_AND_REVIEW_QUEUE.md) | Facility manager operations (`/manage`): review queue, review detail with `ReasonDialog`, strict **no-self-approval lockout**, and returns desk |
| **09** | [09_SERVICES_NEEDS_AND_COORDINATION.md](./09_SERVICES_NEEDS_AND_COORDINATION.md) | Staff-operated service tracking (`/me/services/:id`), missing-resource form (`/need`), coordinator desk (`/coordinate`), and referrals |
| **10** | [10_INCIDENTS_ADMIN_AUDIT_AND_HISTORY.md](./10_INCIDENTS_ADMIN_AUDIT_AND_HISTORY.md) | Incident reporting & resolution, transaction history view (`/history/:type/:id`) with PDF receipt, and institutional admin screens |

---

## Core Frontend Principles

1. **Workflow First, Not Dashboard-Card First:** Every screen answers: *"What do I need to do next?"*
2. **Status is Always Visible:** Every request/booking displays a status badge, next action, and the responsible actor.
3. **Availability != Eligibility:** A green *"Slot free"* indicator can sit beside a red *"Training missing"* requirement.
4. **Explain Every Decision:** Approvals, rejections, waitlists, and incident rulings must display who decided, when, why, and provide a clear appeal/next-action route.
5. **No Dead Buttons & Honest Labelling:** Incomplete features are omitted. Simulated features carry visible **`Demo`**, **`AI suggestion`**, or **`Simulated payment`** tags.
6. **Privacy by Display:** Public screens never reveal door codes, access instructions, or other users' private contact details.
