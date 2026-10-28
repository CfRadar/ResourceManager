# Step 01: Database Models, Schema & Migrations

This guide details the database architecture, table definitions, relationships, indexes, and concurrency constraints.

---

## 1. Database Tooling Recommendation

- **Default Engine:** PostgreSQL (v15+)
- **Query Builder / Migration Runner:** Knex.js or Kysely (lightweight, strict SQL control, fast migrations).
- **Agnostic Principle:** The database layer uses a clean repository pattern (`src/modules/*/repository.js`) so queries are isolated from business logic.

---

## 2. Core Tables and Schema Specification

### 2.1 Users & Authentication
- `users`: `id` (UUID PK), `email` (unique), `password_hash`, `name`, `phone`, `bio`, `affiliation_text`, `email_verified` (boolean), `status` (`ACTIVE`, `SUSPENDED`), `created_at`, `updated_at`.
- `otps`: `id`, `user_id`, `code_hash`, `expires_at`, `attempts`, `created_at`.
- `refresh_tokens`: `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`.

### 2.2 Institutions & Facilities
- `institutions`: `id`, `name`, `type` (`UNIVERSITY`, `POLYTECHNIC`, `RESEARCH_INSTITUTE`, `INNOVATION_HUB`), `verified` (boolean), `city`, `address`, `created_at`.
- `institution_partners`: `institution_id_a`, `institution_id_b`, `established_at`.
- `institution_memberships`: `id`, `user_id`, `institution_id`, `role` (`REQUESTER`, `OWNER`, `MANAGER`, `OPERATOR`, `COORDINATOR`, `ADMIN`), `affiliation_type`, `verified_by`, `verified_at`, `status` (`ACTIVE`, `SUSPENDED`).
- `facilities`: `id`, `institution_id`, `name`, `address`, `lat`, `lng`, `timezone` (e.g. `'Asia/Kolkata'`), `working_hours` (JSONB), `geofence_radius_meters`.

### 2.3 Resources & Policies
- `resources`: `id`, `facility_id`, `name`, `category`, `description`, `specs` (JSONB), `capabilities` (text[]), `visibility` (`PUBLIC`, `NETWORK`, `INSTITUTION`, `PRIVATE`), `risk_level` (`LOW`, `MEDIUM`, `HIGH`), `status` (`ACTIVE`, `INACTIVE`), `created_at`.
- `resource_photos`: `id`, `resource_id`, `file_id`, `caption`, `is_primary`, `sort_order`.
- `resource_policies`: `id`, `resource_id`, `policy_version` (integer), `policy_data` (JSONB matching Section 4.6), `updated_by`, `created_at`.

### 2.4 Access Requests & Bookings
- `access_requests`: `id`, `resource_id`, `requester_id`, `access_mode` (`INDEPENDENT`, `SUPERVISED`, `STAFF_SERVICE`, `COLLABORATION`), `start_at`, `end_at`, `purpose`, `outside_materials` (JSONB), `status` (state machine enum), `policy_version_applied`, `reviewer_id`, `created_at`, `updated_at`.
- `bookings`: `id`, `request_id`, `resource_id`, `user_id`, `start_at`, `end_at`, `status` (`SCHEDULED`, `CHECKED_IN`, `IN_USE`, `RETURNED`, `CLOSED`, `CANCELLED`), `checked_in_at`, `returned_at`, `created_at`.
- `waitlist_entries`: `id`, `resource_id`, `request_id`, `desired_start`, `desired_end`, `position`, `priority_reason`, `status` (`PENDING`, `OFFERED`, `EXPIRED`, `CANCELLED`), `created_at`.
- `blackout_periods`: `id`, `resource_id`, `start_at`, `end_at`, `reason`, `created_by`, `created_at`.

### 2.5 Condition Reports & Uploads
- `condition_reports`: `id`, `booking_id`, `kind` (`BEFORE`, `AFTER`), `rating` (1-5), `notes`, `photos` (text[]), `accessories` (JSONB), `signature` (JSONB), `geo_status` (`WITHIN`, `OUTSIDE`, `NOT_PROVIDED`), `submitted_at`.
- `file_uploads`: `id`, `original_name`, `mime_type`, `size_bytes`, `storage_path`, `uploaded_by`, `created_at`.

### 2.6 Documents, Trainings, Incidents & Tokens
- `document_templates`: `id`, `institution_id`, `title`, `body_text`, `requires_upload`, `requires_signature`, `expires_after_days`.
- `user_documents`: `id`, `user_id`, `template_id`, `file_id`, `signature` (JSONB), `status`, `expires_at`, `verified_by`.
- `trainings`: `id`, `institution_id`, `name`, `validity_days`.
- `user_trainings`: `id`, `user_id`, `training_id`, `verified_by`, `completed_at`, `expires_at`, `status`.
- `incidents`: `id`, `booking_id`, `reporter_id`, `type`, `description`, `severity_by_reporter`, `status`, `findings`, `created_at`.
- `token_ledger`: `id`, `user_id`, `amount` (integer, positive/negative), `type` (`ALLOWANCE`, `HOLD`, `CHARGE`, `REFUND`), `ref_entity_type`, `ref_entity_id`, `created_at`.
- `audit_events`: `id`, `seq` (bigserial), `at`, `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `resource_id`, `reason`, `visibility`, `payload` (JSONB), `prev_hash`, `hash`.

---

## 3. Exclusion Constraint for Overlap Prevention

In PostgreSQL, create the GIST exclusion constraint on the `bookings` table to guarantee that no two overlapping bookings can ever be scheduled concurrently:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_at, end_at) WITH &&
)
WHERE (status IN ('SCHEDULED', 'CHECKED_IN', 'IN_USE'));
```

### Portable Fallback (Any Database / SQLite)
When not on Postgres, wrap slot reservation in an advisory transaction lock:
```sql
BEGIN;
SELECT COUNT(*) FROM bookings 
WHERE resource_id = :resourceId 
  AND status IN ('SCHEDULED', 'CHECKED_IN', 'IN_USE')
  AND start_at < :newEnd 
  AND end_at > :newStart 
FOR UPDATE;
-- If count == 0, insert new booking, then COMMIT
```

---

## 4. Implementation Checklist

- [ ] Write migration script `001_initial_schema.js`.
- [ ] Add GIST constraint or transaction lock wrapper.
- [ ] Write seed script `seed_demo_data.js` with sample institutions, facilities, users, and resources.
- [ ] Configure Knex connection pool with healthcheck probe in `src/config/db.js`.
