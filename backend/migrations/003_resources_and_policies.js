'use strict';

/**
 * migrations/003_resources_and_policies.js
 *
 * Tables: resources, resource_photos, resource_policies
 * Spec §4.5, §4.6
 */

/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  // ── resources ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('resources', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('facility_id').notNullable().references('id').inTable('facilities').onDelete('RESTRICT');
    t.string('name', 255).notNullable();
    t.string('category', 128).notNullable();
    t.text('description').nullable();
    // JSONB specs: { weight: '2kg', power: '220V', ... }
    t.jsonb('specs').nullable();
    // text[] capabilities: ['FDM', 'PLA', 'PETG']
    t.specificType('capabilities', 'text[]').nullable();
    t.enum('visibility', ['PUBLIC', 'NETWORK', 'INSTITUTION', 'PRIVATE'])
      .notNullable()
      .defaultTo('PUBLIC');
    t.enum('risk_level', ['LOW', 'MEDIUM', 'HIGH']).notNullable().defaultTo('LOW');
    t.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
    t.uuid('created_by').nullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index(['facility_id', 'status']);
    t.index(['category']);
    t.index(['visibility']);
  });

  // ── resource_photos ───────────────────────────────────────────────────────
  // Spec §4.5: soft-delete only (deleted_at)
  await knex.schema.createTable('resource_photos', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('resource_id').notNullable().references('id').inTable('resources').onDelete('CASCADE');
    t.uuid('file_id').notNullable(); // references file_uploads.id (created in migration 005)
    t.string('caption', 512).nullable();
    t.boolean('is_primary').notNullable().defaultTo(false);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamp('deleted_at', { useTz: true }).nullable(); // soft-delete
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['resource_id']);
  });

  // ── resource_policies ─────────────────────────────────────────────────────
  // Spec §4.6: versioned — each save creates policyVersion + 1.
  // Bookings store the policy_version they were approved under.
  await knex.schema.createTable('resource_policies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('resource_id').notNullable().references('id').inTable('resources').onDelete('CASCADE');
    t.integer('policy_version').notNullable().defaultTo(1);
    // Full policy JSON validated by Zod in the application layer (spec §4.6 JSON schema)
    t.jsonb('policy_data').notNullable();
    t.uuid('updated_by').nullable().references('id').inTable('users');
    t.boolean('is_current').notNullable().defaultTo(true);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['resource_id', 'is_current']);
    t.unique(['resource_id', 'policy_version']);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('resource_policies');
  await knex.schema.dropTableIfExists('resource_photos');
  await knex.schema.dropTableIfExists('resources');
};
