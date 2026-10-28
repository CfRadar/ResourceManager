'use strict';

/**
 * migrations/005_condition_reports_and_uploads.js
 *
 * Tables: file_uploads, condition_reports
 * Spec §4.12 (check-in/out), §4.15 (document uploads)
 */

/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  // ── file_uploads ──────────────────────────────────────────────────────────
  // Stores metadata; actual bytes live on disk or S3 (fileService.js).
  // Spec §5.2: random filenames, stored outside web root, served via authorised endpoints.
  await knex.schema.createTable('file_uploads', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('original_name', 512).nullable();
    t.string('mime_type', 128).notNullable();
    t.integer('size_bytes').notNullable();
    // storage_path is a relative path or S3 key — never a public URL.
    t.string('storage_path', 1024).notNullable();
    t.uuid('uploaded_by').notNullable().references('id').inTable('users');
    // Purpose tag for retention policy (spec §5.2):
    //   CONDITION_PHOTO → purge after RETENTION.CONDITION_PHOTO_DAYS
    //   DOCUMENT        → managed per document record expiry
    //   INCIDENT        → managed per incident closure
    t.string('purpose', 64).notNullable().defaultTo('GENERAL');
    t.timestamp('deleted_at', { useTz: true }).nullable(); // soft-delete only
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['uploaded_by']);
    t.index(['purpose', 'deleted_at']);
  });

  // ── condition_reports ─────────────────────────────────────────────────────
  // Spec §4.12: BEFORE and AFTER reports per booking.
  // Virtual signature: { type: 'TYPED'|'DRAWN', text|pngDataUrl, userId, timestamp, ip, contentHash }
  // GPS geo_status: soft signal only — never auto-block.
  await knex.schema.createTable('condition_reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('RESTRICT');
    t.enum('kind', ['BEFORE', 'AFTER']).notNullable();
    t.integer('rating').nullable(); // 1–5 stars
    t.text('notes').nullable();
    // text[] of file_upload IDs
    t.specificType('photo_ids', 'text[]').nullable();
    // JSONB: [{ name, quantity, condition }]
    t.jsonb('accessories').nullable();
    // JSONB: { type, text|pngDataUrl, userId, timestamp, ip, contentHash }
    t.jsonb('signature').nullable();
    t.enum('geo_status', ['WITHIN', 'OUTSIDE', 'NOT_PROVIDED']).notNullable().defaultTo('NOT_PROVIDED');
    // Raw coordinates stored only for check-in event; purged per retention policy.
    t.decimal('geo_lat', 10, 7).nullable();
    t.decimal('geo_lng', 11, 7).nullable();
    t.timestamp('submitted_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['booking_id', 'kind']); // one BEFORE and one AFTER per booking
    t.index(['booking_id']);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('condition_reports');
  await knex.schema.dropTableIfExists('file_uploads');
};
