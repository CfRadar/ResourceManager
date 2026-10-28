# Step 04: Resources, Policies & Redaction Layer

This guide details resource listings, category vocabularies, dynamic JSON policy validation, visibility filtering, and confidential field redaction.

---

## 1. Resource Catalog Domain (`/resources`)

### 1.1 Visibility Levels (Section 2.2)
- `PUBLIC`: Discoverable by anyone, unauthenticated or external.
- `NETWORK`: Discoverable only by verified members of the host institution or verified partner institutions.
- `INSTITUTION`: Discoverable only by verified members of that specific institution.
- `PRIVATE`: Hidden from search listings. Accessible only by direct ID to authorized managers/owners.

### 1.2 Confidential Field Redaction
Public search (`GET /resources`) and public detail (`GET /resources/:id`) must **strip confidential operational details**:
- Redacted fields: door codes, access instructions, maintenance passwords, internal safety notes, and owner personal phone/email.
- Unredacted private details are only returned via `GET /resources/:id/private-details` to users who have an **approved / scheduled booking** or hold a Manager/Owner role.

### 1.3 Endpoints
- `GET /api/v1/resources` — Visibility-filtered search. Accepts filters: `q`, `category`, `institutionId`, `accessMode`, `city`, `eligibleOnly`.
- `GET /api/v1/resources/:id` — Full public detail + policy summary.
- `GET /api/v1/resources/:id/private-details` — Confidential access instructions.
- `POST /api/v1/facilities/:id/resources` — Create listing (Owner/Manager).
- `PATCH /api/v1/resources/:id` — Update listing (audited).
- `POST /api/v1/resources/:id/deactivate` — Soft deactivation (never hard-deletes).

---

## 2. Dynamic Resource Policy (`ResourcePolicy`)

Every resource has an active policy defining risk and access boundaries (Section 4.6).

### 2.1 Policy Schema (Zod Validation)
```javascript
export const ResourcePolicySchema = z.object({
  supportedAccessModes: z.array(z.enum(['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE', 'COLLABORATION'])),
  permittedUserGroups: z.array(z.enum(['INTERNAL_STUDENT', 'INTERNAL_STAFF', 'PARTNER_INSTITUTION', 'EXTERNAL_COMMERCIAL', 'PUBLIC'])),
  requiresPurposeStatement: z.boolean(),
  requiresApproval: z.boolean(),
  requiredTrainingIds: z.array(z.string()),
  requiredDocumentTemplateIds: z.array(z.string()),
  supervisionRequiredFor: z.array(z.string()),
  allowOutsideMaterials: z.enum(['ALLOWED', 'PROHIBITED', 'NEEDS_APPROVAL']),
  prohibitedUses: z.array(z.string()),
  limits: z.object({
    maxActiveBookings: z.number().int().min(1),
    maxHoursPerWeek: z.number().int().min(1),
    maxSingleBookingHours: z.number().int().min(1),
    advanceBookingDays: z.number().int().min(1)
  }),
  cancellation: z.object({
    freeUntilHoursBefore: z.number().int(),
    noShowStrikeLimit: z.number().int().default(3)
  }),
  lateReturn: z.object({
    graceMinutes: z.number().int().default(15),
    reminderMinutesBefore: z.number().int().default(30)
  }),
  pricing: z.object({
    model: z.enum(['FREE', 'HOURLY', 'COST_RECOVERY', 'QUOTE', 'TOKENS']),
    hourlyRate: z.number().min(0),
    operatorFee: z.number().min(0),
    tokensPerHour: z.number().min(0)
  }),
  geofenceCheckIn: z.object({
    enabled: z.boolean(),
    radiusMeters: z.number().int().default(150)
  }),
  conditionReport: z.object({
    requireBefore: z.boolean(),
    requireAfter: z.boolean(),
    requirePhotos: z.enum(['NONE', 'OPTIONAL', 'REQUIRED'])
  })
});
```

### 2.2 Policy Versioning
- Updating policy (`PUT /resources/:id/policy`) does not overwrite existing rows.
- Creates a new record with `policy_version = currentVersion + 1`.
- Existing bookings retain the `policyVersionApplied` under which they were originally reviewed and approved.

---

## 3. Implementation Checklist

- [ ] Implement SQL query builder filtering by `visibility` according to caller's verified institution memberships.
- [ ] Implement `policyService.createPolicyVersion()` transaction.
- [ ] Add redaction utility `redactResourceDetails(resource, callerRole)` before JSON serialization.
