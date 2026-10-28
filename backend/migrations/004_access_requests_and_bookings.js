'use strict';

/**
 * migrations/004_access_requests_and_bookings.js
 *
 * Tables: access_requests, bookings (+ GIST exclusion constraint), waitlist_entries, blackout_periods
 * Spec §4.9, §4.10, §4.11, §3.1
 */

/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  // ── btree_gist extension (required for GIST exclusion on bookings) ────────
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');

  // ── access_requests ───────────────────────────────────────────────────────
  // State machine §3.1
  const arStatuses = [
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED',
    'AWAITING_DOCUMENTS', 'AWAITING_TRAINING', 'AWAITING_AGREEMENT',
    'APPROVED', 'REJECTED', 'WAITLISTED',
    'SCHEDULED', 'CHECKED_IN', 'IN_USE', 'RETURNED', 'CLOSED',
    'CANCELLED', 'EXPIRED', 'INCIDENT_REPORTED',
  ];

  await knex.schema.createTable('access_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('resource_id').notNullable().references('id').inTable('resources').onDelete('RESTRICT');
    t.uuid('requester_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.enum('access_mode', ['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE', 'COLLABORATION'])
      .notNullable();
    t.timestamp('start_at', { useTz: true }).nullable();
    t.timestamp('end_at', { useTz: true }).nullable();
    t.text('purpose').notNullable();
    t.jsonb('outside_materials').nullable();
    t.jsonb('acknowledgments').nullable();
    t.enum('status', arStatuses).notNullable().defaultTo('DRAFT');
    t.integer('policy_version_applied').nullable();
    // Spec §2.2: no-self-approval enforced at service layer (reviewerId !== requesterId)
    t.uuid('reviewer_id').nullable().references('id').inTable('users');
    t.timestamp('reviewer_locked_at', { useTz: true }).nullable();
    t.text('rejection_reason').nullable();
    t.text('review_conditions').nullable();
    t.integer('appeal_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index(['resource_id', 'status']);
    t.index(['requester_id']);
    t.index(['reviewer_id']);
  });

  // ── bookings ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('bookings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('request_id').notNullable().references('id').inTable('access_requests').onDelete('RESTRICT');
    t.uuid('resource_id').notNullable().references('id').inTable('resources').onDelete('RESTRICT');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamp('start_at', { useTz: true }).notNullable();
    t.timestamp('end_at', { useTz: true }).notNullable();
    t.enum('status', ['SCHEDULED', 'CHECKED_IN', 'IN_USE', 'RETURNED', 'CLOSED', 'CANCELLED', 'OVERDUE', 'NEEDS_REBOOK'])
      .notNullable()
      .defaultTo('SCHEDULED');
    t.timestamp('checked_in_at', { useTz: true }).nullable();
    t.timestamp('returned_at', { useTz: true }).nullable();
    t.integer('policy_version_applied').nullable();
    t.integer('no_show_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index(['resource_id', 'status', 'start_at', 'end_at']);
    t.index(['user_id']);
  });

  // ── GIST exclusion constraint (spec §4.11 — overlap prevention) ───────────
  // Prevents any two active bookings from overlapping on the same resource.
  // The half-open interval [start_at, end_at) is modelled with tstzrange.
  await knex.raw(`
    ALTER TABLE bookings
    ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING gist (
      resource_id WITH =,
      tstzrange(start_at, end_at) WITH &&
    )
    WHERE (status IN ('SCHEDULED', 'CHECKED_IN', 'IN_USE'))
  `);

  // ── waitlist_entries ──────────────────────────────────────────────────────
  // Spec §4.10 WAITLIST: FIFO by created_at unless institution enables priorityRules.
  await knex.schema.createTable('waitlist_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('resource_id').notNullable().references('id').inTable('resources').onDelete('CASCADE');
    t.uuid('request_id').notNullable().references('id').inTable('access_requests').onDelete('CASCADE');
    t.timestamp('desired_start', { useTz: true }).notNullable();
    t.timestamp('desired_end', { useTz: true }).notNullable();
    t.integer('position').notNullable(); // FIFO position; 1 = first
    t.text('priority_reason').nullable(); // filled only when institution priorityRules applied
    t.enum('status', ['PENDING', 'OFFERED', 'EXPIRED', 'CANCELLED']).notNullable().defaultTo('PENDING');
    t.timestamp('offer_expires_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['resource_id', 'status', 'position']);
  });

  // ── blackout_periods ──────────────────────────────────────────────────────
  // Spec §4.7
  await knex.schema.createTable('blackout_periods', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('resource_id').notNullable().references('id').inTable('resources').onDelete('CASCADE');
    t.timestamp('start_at', { useTz: true }).notNullable();
    t.timestamp('end_at', { useTz: true }).notNullable();
    t.text('reason').nullable();
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamp('deleted_at', { useTz: true }).nullable(); // soft-delete
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['resource_id', 'start_at', 'end_at']);
  });

  // ── availability_polls ────────────────────────────────────────────────────
  // Spec §4.7 P1
  await knex.schema.createTable('availability_polls', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('resource_id').notNullable().references('id').inTable('resources').onDelete('CASCADE');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.string('label', 255).notNullable(); // e.g. "Saturday mornings"
    t.jsonb('preferred_windows').nullable(); // [{ dayOfWeek, startHour, endHour }]
    t.integer('vote_count').notNullable().defaultTo(0);
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['resource_id', 'active']);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('availability_polls');
  await knex.schema.dropTableIfExists('blackout_periods');
  await knex.schema.dropTableIfExists('waitlist_entries');
  // Remove constraint first, then table
  await knex.raw(`
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings
  `).catch(() => {}); // ignore if table already gone
  await knex.schema.dropTableIfExists('bookings');
  await knex.schema.dropTableIfExists('access_requests');
};
