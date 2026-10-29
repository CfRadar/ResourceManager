'use strict';

/**
 * src/modules/auth/auth.repository.js
 *
 * Data access for the auth module.
 * All column names are taken verbatim from migration 001_users_and_auth.js.
 *
 * Tables:
 *   users            – email, password_hash, name, phone, email_verified,
 *                      platform_role, status, failed_login_attempts, locked_until
 *   otps             – user_id, code_hash, expires_at, attempts, used
 *   refresh_tokens   – user_id, token_hash, expires_at, revoked_at, user_agent, ip_address
 *   institution_memberships – user_id, institution_id, role, status (migration 002)
 */

const { BaseRepository } = require('../../db/BaseRepository');
const { db }             = require('../../config/db');

// ─── User repository ──────────────────────────────────────────────────────────

class UserRepository extends BaseRepository {
  constructor() {
    // users table has no `deleted_at`; disable soft-delete filter.
    super('users', { softDelete: false });
  }

  /** Find by email (normalized). Returns null if not found. */
  async findByEmail(email, trx = null) {
    const qb = trx ? trx('users') : db('users');
    return qb.where({ email }).first() || null;
  }

  /**
   * Safe user object for API responses — never exposes password_hash,
   * failed_login_attempts, or locked_until.
   */
  static sanitize(user) {
    const {
      password_hash,        // eslint-disable-line no-unused-vars
      failed_login_attempts,// eslint-disable-line no-unused-vars
      locked_until,         // eslint-disable-line no-unused-vars
      ...safe
    } = user;
    return safe;
  }

  /** Increment failed login attempts; lock account when threshold reached. */
  async incrementFailedLogin(userId, trx = null) {
    const qb = trx ? trx('users') : db('users');
    await qb.where({ id: userId }).increment('failed_login_attempts', 1);

    // Re-read current count
    const qb2 = trx ? trx('users') : db('users');
    const { failed_login_attempts: count } = await qb2
      .where({ id: userId })
      .select('failed_login_attempts')
      .first();

    // Lock for 15 minutes after 5 consecutive failures.
    if (count >= 5) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      const qb3 = trx ? trx('users') : db('users');
      await qb3.where({ id: userId }).update({ locked_until: lockedUntil });
    }
  }

  /** Reset failed login counter after a successful login. */
  async resetFailedLogin(userId, trx = null) {
    const qb = trx ? trx('users') : db('users');
    await qb.where({ id: userId }).update({ failed_login_attempts: 0, locked_until: null });
  }
}

// ─── OTP repository ───────────────────────────────────────────────────────────

class OtpRepository extends BaseRepository {
  constructor() {
    super('otps', { softDelete: false });
  }

  /**
   * Mark all outstanding (unused) OTPs for a user as used,
   * preventing reuse of old codes when a new one is issued.
   */
  async invalidatePreviousOtps(userId, trx = null) {
    const qb = trx ? trx('otps') : db('otps');
    await qb.where({ user_id: userId, used: false }).update({ used: true });
  }

  /**
   * Find the most recent unused, unexpired OTP for a user.
   * Used during verification to locate the active OTP record.
   */
  async findActiveOtp(userId, trx = null) {
    const qb = trx ? trx('otps') : db('otps');
    return qb
      .where({ user_id: userId, used: false })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first() || null;
  }

  /** Increment attempt counter. Returns the updated row. */
  async incrementAttempts(otpId, trx = null) {
    const qb = trx ? trx('otps') : db('otps');
    await qb.where({ id: otpId }).increment('attempts', 1);
    const qb2 = trx ? trx('otps') : db('otps');
    return qb2.where({ id: otpId }).first();
  }

  /** Mark an OTP as used (consumed). */
  async markUsed(otpId, trx = null) {
    const qb = trx ? trx('otps') : db('otps');
    await qb.where({ id: otpId }).update({ used: true });
  }
}

// ─── Refresh token repository ─────────────────────────────────────────────────

class RefreshTokenRepository extends BaseRepository {
  constructor() {
    super('refresh_tokens', { softDelete: false });
  }

  /** Find an active (not revoked, not expired) record by token hash. */
  async findActiveByHash(tokenHash, trx = null) {
    const qb = trx ? trx('refresh_tokens') : db('refresh_tokens');
    return qb
      .where({ token_hash: tokenHash })
      .whereNull('revoked_at')
      .where('expires_at', '>', new Date())
      .first() || null;
  }

  /** Revoke a token record by its database ID. */
  async revokeById(id, trx = null) {
    const qb = trx ? trx('refresh_tokens') : db('refresh_tokens');
    await qb.where({ id }).update({ revoked_at: db.fn.now() });
  }

  /** Revoke all active tokens for a user (e.g. on account suspension). */
  async revokeAllForUser(userId, trx = null) {
    const qb = trx ? trx('refresh_tokens') : db('refresh_tokens');
    await qb
      .where({ user_id: userId })
      .whereNull('revoked_at')
      .update({ revoked_at: db.fn.now() });
  }
}

// ─── Membership repository ────────────────────────────────────────────────────

class MembershipRepository extends BaseRepository {
  constructor() {
    super('institution_memberships', { softDelete: false });
  }

  /**
   * Return active memberships for embedding in a JWT.
   * Shape matches the spec: [{ institutionId, role }]
   */
  async findActiveForUser(userId, trx = null) {
    const qb = trx ? trx('institution_memberships') : db('institution_memberships');
    const rows = await qb
      .where({ user_id: userId, status: 'ACTIVE' })
      .select('institution_id', 'role');
    return rows.map((r) => ({ institutionId: r.institution_id, role: r.role }));
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

const userRepo       = new UserRepository();
const otpRepo        = new OtpRepository();
const refreshRepo    = new RefreshTokenRepository();
const membershipRepo = new MembershipRepository();

module.exports = { userRepo, otpRepo, refreshRepo, membershipRepo, UserRepository };
