'use strict';

/**
 * migrations/007_service_and_need_requests.js
 *
 * Tables: service_requests, service_request_quotes, need_requests, referrals, notifications
 * Spec §4.13, §4.14, §4.19
 */

/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  // ── service_requests ──────────────────────────────────────────────────────
  // State machine §3.2
  const srStatuses = [
    'DRAFT', 'SUBMITTED', 'SCOPE_REVIEW', 'NOT_FEASIBLE',
    'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_DECLINED',
    'AWAITING_MATERIALS', 'MATERIALS_RECEIVED',
    'SERVICE_IN_PROGRESS', 'OUTPUT_DELIVERED', 'COMPLETED', 'CLOSED',
    'CANCELLED',
  ];

  await knex.schema.createTable('service_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('resource_id').notNullable().references('id').inTable('resources').onDelete('RESTRICT');
    t.uuid('requester_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('facility_id').notNullable().references('id').inTable('facilities').onDelete('RESTRICT');
    t.text('description').notNullable();
    t.text('expected_output').nullable();
    t.jsonb('submitted_materials').nullable();
    t.jsonb('estimated_timeline').nullable(); // { value, unit }
    t.enum('status', srStatuses).notNullable().defaultTo('DRAFT');
    t.uuid('assigned_operator_id').nullable().references('id').inTable('users');
    t.integer('policy_version_applied').nullable();
    t.text('scope_assessment').nullable();
    t.text('cancellation_reason').nullable();
    t.timestamps(true, true);
    t.index(['resource_id', 'status']);
    t.index(['requester_id']);
    t.index(['facility_id', 'status']);
  });

  // Add FK from incidents to service_requests (deferred until both tables exist)
  await knex.schema.alterTable('incidents', (t) => {
    t.foreign('service_request_id').references('id').inTable('service_requests').onDelete('RESTRICT');
  });

  // ── service_request_quotes ────────────────────────────────────────────────
  // Spec §4.13: quote with line items; requester responds ACCEPT/DECLINE
  await knex.schema.createTable('service_request_quotes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('service_request_id').notNullable().references('id').inTable('service_requests').onDelete('CASCADE');
    t.jsonb('line_items').notNullable(); // [{ description, cost, currency }]
    t.decimal('total_cost', 12, 2).nullable();
    t.string('currency', 10).notNullable().defaultTo('INR');
    t.text('notes').nullable();
    t.boolean('demo').notNullable().defaultTo(true); // spec §0: demo flag required
    t.enum('status', ['PENDING', 'ACCEPTED', 'DECLINED']).notNullable().defaultTo('PENDING');
    t.timestamp('responded_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['service_request_id']);
  });

  // ── need_requests ─────────────────────────────────────────────────────────
  // Spec §4.14: missing-resource need request
  await knex.schema.createTable('need_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('requester_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('institution_id').nullable().references('id').inTable('institutions');
    t.text('free_text').nullable(); // raw input for AI parse
    t.string('category', 128).nullable(); // after parse/confirmation
    t.text('description').nullable();
    t.jsonb('required_capabilities').nullable(); // text[]
    t.jsonb('preferred_dates').nullable();
    t.enum('access_mode_preference', ['INDEPENDENT', 'SUPERVISED', 'STAFF_SERVICE', 'COLLABORATION'])
      .nullable();
    t.boolean('consent_share_contact').notNullable().defaultTo(false);
    t.enum('status', ['DRAFT', 'SUBMITTED', 'UNDER_COORDINATOR_REVIEW', 'CANDIDATE_IDENTIFIED', 'CLOSED_MET', 'CLOSED_UNMET'])
      .notNullable()
      .defaultTo('DRAFT');
    t.uuid('coordinator_id').nullable().references('id').inTable('users');
    t.text('close_reason').nullable();
    t.timestamps(true, true);
    t.index(['requester_id', 'status']);
    t.index(['coordinator_id', 'status']);
  });

  // ── referrals ─────────────────────────────────────────────────────────────
  // Spec §4.14 state machine §3.3
  await knex.schema.createTable('referrals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('need_request_id').notNullable().references('id').inTable('need_requests').onDelete('CASCADE');
    t.uuid('coordinator_id').notNullable().references('id').inTable('users');
    t.uuid('target_institution_id').nullable().references('id').inTable('institutions');
    t.uuid('target_resource_id').nullable().references('id').inTable('resources');
    t.text('referral_message').nullable();
    t.boolean('contact_released').notNullable().defaultTo(false);
    t.enum('status', ['SUBMITTED', 'COORDINATOR_REVIEW', 'CANDIDATE_IDENTIFIED', 'REFERRAL_SENT', 'ACCEPTED', 'DECLINED', 'NO_RESPONSE'])
      .notNullable()
      .defaultTo('SUBMITTED');
    t.uuid('responded_by').nullable().references('id').inTable('users');
    t.text('response_message').nullable();
    t.timestamp('responded_at', { useTz: true }).nullable();
    t.timestamp('no_response_at', { useTz: true }).nullable();
    t.timestamps(true, true);
    t.index(['need_request_id']);
    t.index(['target_institution_id', 'status']);
  });

  // ── notifications ─────────────────────────────────────────────────────────
  // Spec §4.19: in-app notifications (email via adapter in P1)
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('event_type', 128).notNullable(); // e.g. 'BOOKING_REMINDER_24H'
    t.string('title', 512).notNullable();
    t.text('body').nullable();
    t.jsonb('action_link').nullable(); // { label, url }
    t.jsonb('meta').nullable(); // entity references
    t.boolean('read').notNullable().defaultTo(false);
    t.timestamp('read_at', { useTz: true }).nullable();
    t.boolean('email_sent').notNullable().defaultTo(false);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['user_id', 'read', 'created_at']);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('referrals');
  await knex.schema.dropTableIfExists('need_requests');
  await knex.schema.dropTableIfExists('service_request_quotes');
  // Remove deferred FK from incidents first
  await knex.schema.alterTable('incidents', (t) => {
    t.dropForeign(['service_request_id']);
  }).catch(() => {});
  await knex.schema.dropTableIfExists('service_requests');
};
