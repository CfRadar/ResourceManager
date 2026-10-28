'use strict';

/**
 * migrations/001_users_and_auth.js
 *
 * Tables: users, otps, refresh_tokens
 * Spec §4.1, §2.1, §4.2
 */

/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  // ── users ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email', 254).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('name', 255).notNullable();
    t.string('phone', 32).nullable();
    t.text('bio').nullable();
    t.text('affiliation_text').nullable();
    t.boolean('email_verified').notNullable().defaultTo(false);
    // Spec §2.1: platform-level role (institution-scoped roles are in institution_memberships)
    t.enum('platform_role', ['REQUESTER', 'OWNER', 'MANAGER', 'OPERATOR', 'COORDINATOR', 'ADMIN'])
      .notNullable()
      .defaultTo('REQUESTER');
    t.enum('status', ['ACTIVE', 'SUSPENDED']).notNullable().defaultTo('ACTIVE');
    t.integer('failed_login_attempts').notNullable().defaultTo(0);
    t.timestamp('locked_until', { useTz: true }).nullable();
    t.timestamps(true, true); // created_at, updated_at
  });

  // ── otps ─────────────────────────────────────────────────────────────────
  // Virtual/demo OTP verification (spec §4.1)
  await knex.schema.createTable('otps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('code_hash', 255).notNullable();  // bcrypt hash of the 6-digit code
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.integer('attempts').notNullable().defaultTo(0);
    t.boolean('used').notNullable().defaultTo(false);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['user_id', 'used']);
  });

  // ── refresh_tokens ────────────────────────────────────────────────────────
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash', 255).notNullable().unique(); // SHA-256 of the raw token
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('revoked_at', { useTz: true }).nullable();
    t.string('user_agent', 512).nullable();
    t.string('ip_address', 45).nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['user_id']);
    t.index(['token_hash']);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('otps');
  await knex.schema.dropTableIfExists('users');
};
