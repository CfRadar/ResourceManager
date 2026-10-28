'use strict';

/**
 * migrations/002_institutions_and_facilities.js
 *
 * Tables: institutions, institution_partners, institution_memberships, facilities
 * Spec §4.3, §4.4, §2.1
 */

/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  // ── institutions ──────────────────────────────────────────────────────────
  await knex.schema.createTable('institutions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 255).notNullable();
    t.enum('type', ['UNIVERSITY', 'POLYTECHNIC', 'RESEARCH_INSTITUTE', 'INNOVATION_HUB'])
      .notNullable()
      .defaultTo('UNIVERSITY');
    t.boolean('verified').notNullable().defaultTo(false);
    t.string('city', 128).nullable();
    t.text('address').nullable();
    t.string('website', 512).nullable();
    t.text('description').nullable();
    t.timestamps(true, true);
  });

  // ── institution_partners ──────────────────────────────────────────────────
  // Bidirectional: (a, b) and (b, a) are the same partnership.
  // Enforce a < b at insert time to avoid duplicates.
  await knex.schema.createTable('institution_partners', (t) => {
    t.uuid('institution_id_a').notNullable().references('id').inTable('institutions').onDelete('CASCADE');
    t.uuid('institution_id_b').notNullable().references('id').inTable('institutions').onDelete('CASCADE');
    t.timestamp('established_at', { useTz: true }).defaultTo(knex.fn.now());
    t.primary(['institution_id_a', 'institution_id_b']);
  });

  // ── institution_memberships ───────────────────────────────────────────────
  // Spec §2.1: a user can hold different roles at different institutions.
  await knex.schema.createTable('institution_memberships', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('institution_id').notNullable().references('id').inTable('institutions').onDelete('CASCADE');
    t.enum('role', ['REQUESTER', 'OWNER', 'MANAGER', 'OPERATOR', 'COORDINATOR', 'ADMIN'])
      .notNullable()
      .defaultTo('REQUESTER');
    t.string('affiliation_type', 64).nullable(); // e.g. INTERNAL_STUDENT, STAFF, EXTERNAL_COMMERCIAL
    t.uuid('verified_by').nullable().references('id').inTable('users');
    t.timestamp('verified_at', { useTz: true }).nullable();
    t.enum('status', ['ACTIVE', 'SUSPENDED']).notNullable().defaultTo('ACTIVE');
    t.timestamps(true, true);
    t.unique(['user_id', 'institution_id']); // one active membership per institution
    t.index(['institution_id']);
  });

  // ── membership_requests ───────────────────────────────────────────────────
  // Pre-membership join requests (spec §4.3)
  await knex.schema.createTable('membership_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('institution_id').notNullable().references('id').inTable('institutions').onDelete('CASCADE');
    t.string('requested_role', 32).notNullable().defaultTo('REQUESTER');
    t.text('message').nullable();
    t.string('supporting_document_id', 255).nullable(); // file_id reference
    t.enum('status', ['PENDING', 'APPROVED', 'REJECTED']).notNullable().defaultTo('PENDING');
    t.uuid('reviewed_by').nullable().references('id').inTable('users');
    t.text('review_reason').nullable();
    t.timestamp('reviewed_at', { useTz: true }).nullable();
    t.timestamps(true, true);
    t.index(['institution_id', 'status']);
  });

  // ── facilities ────────────────────────────────────────────────────────────
  // Spec §4.4
  await knex.schema.createTable('facilities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('institution_id').notNullable().references('id').inTable('institutions').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.text('address').nullable();
    t.decimal('lat', 10, 7).nullable();
    t.decimal('lng', 11, 7).nullable();
    t.string('timezone', 64).notNullable().defaultTo('UTC');
    // JSONB working hours: { mon: [{open:'09:00',close:'17:00'}], ... }
    t.jsonb('working_hours').nullable();
    t.integer('geofence_radius_meters').nullable().defaultTo(150);
    t.timestamps(true, true);
    t.index(['institution_id']);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('facilities');
  await knex.schema.dropTableIfExists('membership_requests');
  await knex.schema.dropTableIfExists('institution_memberships');
  await knex.schema.dropTableIfExists('institution_partners');
  await knex.schema.dropTableIfExists('institutions');
};
