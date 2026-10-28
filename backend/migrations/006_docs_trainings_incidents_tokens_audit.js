'use strict';

/**
 * migrations/006_docs_trainings_incidents_tokens_audit.js
 *
 * Tables: document_templates, user_documents, trainings, user_trainings,
 *         incidents, incident_notes, token_ledger, audit_events
 * Spec §4.15, §4.16, §4.17, §4.20
 */

/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  // ── document_templates ────────────────────────────────────────────────────
  // Spec §4.15: created by Admin/Owner; body text entered by institution.
  await knex.schema.createTable('document_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('institution_id').notNullable().references('id').inTable('institutions').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.text('body_text').nullable();
    t.boolean('requires_upload').notNullable().defaultTo(false);
    t.boolean('requires_signature').notNullable().defaultTo(false);
    t.integer('expires_after_days').nullable();
    t.boolean('legal_reviewed').notNullable().defaultTo(false);
    t.string('legal_reviewer_name', 255).nullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['institution_id', 'active']);
  });

  // ── user_documents ────────────────────────────────────────────────────────
  // Spec §4.15 document record state: REQUIRED → SUBMITTED → APPROVED|REJECTED → EXPIRED
  await knex.schema.createTable('user_documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('template_id').notNullable().references('id').inTable('document_templates').onDelete('RESTRICT');
    t.uuid('request_id').nullable(); // access_request or service_request that triggered requirement
    t.uuid('file_id').nullable().references('id').inTable('file_uploads');
    t.jsonb('signature').nullable();
    t.enum('status', ['REQUIRED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED'])
      .notNullable()
      .defaultTo('REQUIRED');
    t.timestamp('expires_at', { useTz: true }).nullable();
    t.uuid('verified_by').nullable().references('id').inTable('users');
    t.text('review_reason').nullable();
    t.timestamp('reviewed_at', { useTz: true }).nullable();
    t.timestamps(true, true);
    t.index(['user_id', 'status']);
    t.index(['template_id']);
  });

  // ── trainings ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('trainings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('institution_id').notNullable().references('id').inTable('institutions').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.text('description').nullable();
    t.integer('validity_days').nullable(); // null = never expires
    t.string('verification_method', 64).nullable(); // e.g. 'SELF_DECLARE', 'MANAGER_VERIFY'
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['institution_id']);
  });

  // ── user_trainings ─────────────────────────────────────────────────────────
  await knex.schema.createTable('user_trainings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('training_id').notNullable().references('id').inTable('trainings').onDelete('RESTRICT');
    t.uuid('verified_by').nullable().references('id').inTable('users');
    t.timestamp('completed_at', { useTz: true }).nullable();
    t.timestamp('expires_at', { useTz: true }).nullable();
    t.uuid('certificate_file_id').nullable().references('id').inTable('file_uploads');
    t.enum('status', ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'EXPIRED'])
      .notNullable()
      .defaultTo('PENDING_VERIFICATION');
    t.timestamps(true, true);
    t.index(['user_id', 'training_id', 'status']);
  });

  // ── incidents ─────────────────────────────────────────────────────────────
  // Spec §4.16 state machine §3.4
  await knex.schema.createTable('incidents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('booking_id').nullable().references('id').inTable('bookings').onDelete('RESTRICT');
    t.uuid('service_request_id').nullable(); // FK added after service_requests table
    t.uuid('reporter_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.enum('type', ['DAMAGE', 'DELAY', 'CONFLICT', 'SAFETY', 'MISSING_ITEM', 'OTHER']).notNullable();
    t.text('description').notNullable();
    t.string('severity_by_reporter', 32).nullable();
    t.timestamp('occurred_at', { useTz: true }).nullable();
    t.enum('status', ['REPORTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RESOLVED', 'DISMISSED', 'APPEALED'])
      .notNullable()
      .defaultTo('REPORTED');
    t.text('findings').nullable();
    t.jsonb('remedy').nullable(); // { type, amount, tokens } — recommendation only, spec §4.16
    t.uuid('reviewer_id').nullable().references('id').inTable('users');
    t.integer('appeal_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index(['booking_id']);
    t.index(['reporter_id', 'status']);
  });

  // ── incident_notes ────────────────────────────────────────────────────────
  // Spec §4.16: append-only notes per incident
  await knex.schema.createTable('incident_notes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('incident_id').notNullable().references('id').inTable('incidents').onDelete('CASCADE');
    t.uuid('author_id').notNullable().references('id').inTable('users');
    t.text('content').notNullable();
    t.enum('visibility', ['INTERNAL', 'SHARED']).notNullable().defaultTo('SHARED');
    t.jsonb('attachments').nullable(); // [{ fileId, name }]
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['incident_id', 'visibility']);
  });

  // ── token_ledger ──────────────────────────────────────────────────────────
  // Spec §4.17: append-only. balance = SUM of entries. Rows NEVER updated or deleted.
  await knex.schema.createTable('token_ledger', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('amount').notNullable(); // positive = credit, negative = debit
    t.enum('type', ['ALLOWANCE', 'HOLD', 'CHARGE', 'REFUND', 'GRANT', 'ADJUSTMENT'])
      .notNullable();
    t.string('ref_entity_type', 64).nullable(); // 'Booking', 'AccessRequest', etc.
    t.uuid('ref_entity_id').nullable();
    t.text('reason').nullable();
    // Immutable: no updated_at column
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at']);
    t.index(['ref_entity_type', 'ref_entity_id']);
  });

  // ── audit_events ──────────────────────────────────────────────────────────
  // Spec §4.20: tamper-evident SHA-256 hash chain. NEVER updated or deleted.
  await knex.schema.createTable('audit_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.bigIncrements('seq'); // monotonic sequence — used in hash chain
    t.timestamp('at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.uuid('actor_id').nullable().references('id').inTable('users');
    t.string('actor_role', 32).nullable();
    t.string('action', 128).notNullable(); // e.g. 'ACCESS_REQUEST_APPROVED'
    t.string('entity_type', 64).notNullable(); // e.g. 'AccessRequest'
    t.uuid('entity_id').notNullable();
    t.uuid('resource_id').nullable();
    t.text('reason').nullable();
    t.enum('visibility', ['PARTIES', 'INTERNAL']).notNullable().defaultTo('PARTIES');
    t.jsonb('payload').nullable(); // { before, after }
    t.string('prev_hash', 64).nullable(); // SHA-256 of previous event
    t.string('hash', 64).notNullable();    // SHA-256 of (prevHash + canonicalJSON(this event))
    // Immutable: no updated_at column
    t.index(['entity_type', 'entity_id', 'at']);
    t.index(['resource_id', 'at']);
    t.index(['actor_id', 'at']);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('audit_events');
  await knex.schema.dropTableIfExists('token_ledger');
  await knex.schema.dropTableIfExists('incident_notes');
  await knex.schema.dropTableIfExists('incidents');
  await knex.schema.dropTableIfExists('user_trainings');
  await knex.schema.dropTableIfExists('trainings');
  await knex.schema.dropTableIfExists('user_documents');
  await knex.schema.dropTableIfExists('document_templates');
};
