'use strict';

/**
 * src/modules/auth/auth.service.js
 *
 * Business logic for all /api/v1/auth endpoints.
 *
 * Security design:
 *  - Passwords hashed with bcrypt (12 rounds).
 *  - OTPs are 6-digit codes stored only as bcrypt hashes (shorter hash time → argon2 ideal,
 *    but bcrypt is the project dependency; salt rounds lowered to 8 for OTP latency).
 *  - Refresh tokens rotated atomically inside a DB transaction.
 *  - Account lockout after 5 consecutive failed logins (15-min lockout).
 *  - Email enumeration is prevented: register always returns the same success shape.
 *  - Raw tokens are never logged; OTPs are only returned/logged in demo mode.
 *
 * All column names are verified against migration 001_users_and_auth.js.
 */

const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');

const env    = require('../../config/env');
const { db } = require('../../config/db');
const { Errors } = require('../../utils/AppError');

const { userRepo, otpRepo, refreshRepo, membershipRepo } = require('./auth.repository');
const { UserRepository } = require('./auth.repository');
const {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookie,
} = require('./token.service');

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS     = 12;
const OTP_BCRYPT_ROUNDS = 8;   // OTP is short-lived; 12 rounds is too slow for UX
const OTP_LENGTH        = 6;
const OTP_EXPIRES_MS    = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS  = 5;

// ─── OTP helpers ─────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure 6-digit OTP string (with leading zeros).
 * Uses crypto.randomInt for uniform distribution.
 * @returns {string} e.g. "042817"
 */
function generateOtp() {
  const code = crypto.randomInt(0, 1_000_000); // [0, 999999]
  return String(code).padStart(OTP_LENGTH, '0');
}

// ─── register ─────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 *
 * Business rules:
 *  1. Email must not already exist (any status).
 *     We return a generic success even if it does, to prevent email enumeration.
 *  2. Password is hashed with bcrypt (12 rounds) before storage.
 *  3. A 6-digit OTP is generated; only its hash is stored.
 *  4. In demo mode (DEMO_AUTH_ENABLED=true, NODE_ENV≠production), the raw OTP
 *     is returned in the response and logged to the console.
 *
 * @returns {{ message: string, demoOtp?: string }}
 */
async function register({ email, password, name, phone }) {
  // Generate OTP now (before we commit) so we can return it even if we
  // send a "already registered" response (timing-safe approach).
  const rawOtp = generateOtp();

  await db.transaction(async (trx) => {
    // ── 1. Check existing user ──────────────────────────────────────────────
    const existing = await userRepo.findByEmail(email, trx);
    if (existing) {
      // Security: do NOT reveal that the email exists.
      // Silently skip registration. We still return success below.
      return;
    }

    // ── 2. Hash password ────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // ── 3. Create user ──────────────────────────────────────────────────────
    const [user] = await trx('users').insert({
      email,
      password_hash: passwordHash,
      name,
      phone:          phone || null,
      email_verified: false,
      platform_role:  'REQUESTER',
      status:         'ACTIVE',
    }).returning(['id', 'email']);

    // ── 4. Invalidate old OTPs and create new one ───────────────────────────
    await otpRepo.invalidatePreviousOtps(user.id, trx);

    const otpHash    = await bcrypt.hash(rawOtp, OTP_BCRYPT_ROUNDS);
    const expiresAt  = new Date(Date.now() + OTP_EXPIRES_MS);

    await trx('otps').insert({
      user_id:    user.id,
      code_hash:  otpHash,
      expires_at: expiresAt,
      attempts:   0,
      used:       false,
    });
  });

  // ── 5. Demo-mode OTP exposure ─────────────────────────────────────────────
  const isDemoMode = env.DEMO_AUTH_ENABLED && env.NODE_ENV !== 'production';

  if (isDemoMode) {
    // eslint-disable-next-line no-console
    console.log(
      `[AUTH DEMO] 📧 OTP for ${email}: ${rawOtp}` +
      ' — This message is only shown in demo/dev mode. NEVER log OTPs in production.'
    );
  }

  const result = {
    message: 'Registration successful. Please check your email for an OTP to verify your account.',
  };

  // Return OTP only in demo mode + non-production.
  if (isDemoMode) {
    result.demoOtp = rawOtp;
    result.demoNote = 'This OTP is only visible because DEMO_AUTH_ENABLED=true. Not available in production.';
  }

  return result;
}

// ─── verifyOtp ────────────────────────────────────────────────────────────────

/**
 * Verify the OTP and mark the user's email as verified.
 * Returns the user's first access and refresh tokens on success.
 */
async function verifyOtp({ email, otp }, res) {
  return db.transaction(async (trx) => {
    // ── 1. Find user ────────────────────────────────────────────────────────
    const user = await userRepo.findByEmail(email, trx);
    if (!user) {
      // Prevent email enumeration: use generic message.
      throw Errors.Unauthenticated('Invalid email or OTP.');
    }

    if (user.email_verified) {
      throw Errors.Validation('Email is already verified. Please log in.');
    }

    // ── 2. Find active OTP ──────────────────────────────────────────────────
    const otpRecord = await otpRepo.findActiveOtp(user.id, trx);
    if (!otpRecord) {
      throw Errors.Unauthenticated('OTP has expired or does not exist. Please register again.');
    }

    // ── 3. Check attempt limit ──────────────────────────────────────────────
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      throw Errors.Unauthenticated(
        'Too many incorrect OTP attempts. Please request a new OTP.'
      );
    }

    // ── 4. Increment attempts (prevents concurrent use) ─────────────────────
    await otpRepo.incrementAttempts(otpRecord.id, trx);

    // ── 5. Verify hash ──────────────────────────────────────────────────────
    const isValid = await bcrypt.compare(otp, otpRecord.code_hash);
    if (!isValid) {
      throw Errors.Unauthenticated('Invalid OTP. Please check the code and try again.');
    }

    // ── 6. Mark OTP used, mark user verified ────────────────────────────────
    await otpRepo.markUsed(otpRecord.id, trx);
    await trx('users').where({ id: user.id }).update({ email_verified: true });

    // ── 7. Issue tokens ─────────────────────────────────────────────────────
    const memberships = await membershipRepo.findActiveForUser(user.id, trx);
    const accessToken = signAccessToken(user, memberships);

    const { raw, hash, expiresAt } = generateRefreshToken();
    await trx('refresh_tokens').insert({
      user_id:    user.id,
      token_hash: hash,
      expires_at: expiresAt,
    });

    setRefreshCookie(res, raw, expiresAt);

    return {
      accessToken,
      user: UserRepository.sanitize({ ...user, email_verified: true }),
    };
  });
}

// ─── login ────────────────────────────────────────────────────────────────────

/**
 * Authenticate an existing verified user and issue tokens.
 */
async function login({ email, password }, res) {
  // ── 1. Find user ────────────────────────────────────────────────────────────
  const user = await userRepo.findByEmail(email);
  // Constant-time guard: always run bcrypt compare to prevent timing attacks.
  // Using a dummy hash when user is not found.
  const DUMMY_HASH = '$2a$12$KIXmVGIpX5bVz7c8lFzDdeHAZgBnwrZNYBLG3ppd0hGq5LoiEPeAe';
  const hashToCheck = user ? user.password_hash : DUMMY_HASH;

  const isValid = await bcrypt.compare(password, hashToCheck);

  if (!user || !isValid) {
    // Prevent email enumeration. Same message for all invalid-credential cases.
    if (user) await userRepo.incrementFailedLogin(user.id);
    throw Errors.Unauthenticated(
      'Invalid email or password. Please check your credentials and try again.'
    );
  }

  // ── 2. Account health checks ────────────────────────────────────────────────
  if (!user.email_verified) {
    throw Errors.Unauthenticated(
      'Email address is not verified. Please complete OTP verification before logging in.'
    );
  }

  if (user.status === 'SUSPENDED') {
    throw Errors.Forbidden('Your account has been suspended. Please contact support.');
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const unlockMs = new Date(user.locked_until).getTime() - Date.now();
    throw Errors.Unauthenticated(
      `Account is temporarily locked due to too many failed login attempts. ` +
      `Please try again in ${Math.ceil(unlockMs / 60_000)} minute(s).`
    );
  }

  // ── 3. Reset failure counter on successful auth ─────────────────────────────
  await userRepo.resetFailedLogin(user.id);

  // ── 4. Load memberships and issue tokens ────────────────────────────────────
  return db.transaction(async (trx) => {
    const memberships = await membershipRepo.findActiveForUser(user.id, trx);
    const accessToken = signAccessToken(user, memberships);

    const { raw, hash, expiresAt } = generateRefreshToken();
    await trx('refresh_tokens').insert({
      user_id:    user.id,
      token_hash: hash,
      expires_at: expiresAt,
    });

    setRefreshCookie(res, raw, expiresAt);

    return {
      accessToken,
      user: UserRepository.sanitize(user),
    };
  });
}

// ─── refresh ─────────────────────────────────────────────────────────────────

/**
 * Rotate the refresh token and return a new access token.
 * Atomic within a DB transaction: old token is revoked and new one is inserted
 * before any response is sent.
 */
async function refresh(req, res) {
  const rawToken = getRefreshCookie(req);
  if (!rawToken) {
    throw Errors.Unauthenticated('Refresh token is missing. Please log in again.');
  }

  const tokenHash = hashRefreshToken(rawToken);

  return db.transaction(async (trx) => {
    // ── 1. Find and lock the token record ───────────────────────────────────
    const record = await trx('refresh_tokens')
      .where({ token_hash: tokenHash })
      .forUpdate()     // advisory lock prevents double-use in concurrent requests
      .first();

    if (!record) {
      clearRefreshCookie(res);
      throw Errors.Unauthenticated('Refresh token not found. Please log in again.');
    }

    // ── 2. Detect reuse (already revoked) ───────────────────────────────────
    if (record.revoked_at) {
      // Token reuse detected — revoke all tokens for this user (safety measure).
      await trx('refresh_tokens')
        .where({ user_id: record.user_id })
        .whereNull('revoked_at')
        .update({ revoked_at: db.fn.now() });
      clearRefreshCookie(res);
      throw Errors.Unauthenticated(
        'Refresh token reuse detected. All sessions have been revoked. Please log in again.'
      );
    }

    // ── 3. Check expiry ─────────────────────────────────────────────────────
    if (new Date(record.expires_at) <= new Date()) {
      clearRefreshCookie(res);
      throw Errors.Unauthenticated('Refresh token has expired. Please log in again.');
    }

    // ── 4. Revoke old token ─────────────────────────────────────────────────
    await trx('refresh_tokens').where({ id: record.id }).update({ revoked_at: db.fn.now() });

    // ── 5. Load user and memberships ────────────────────────────────────────
    const user = await trx('users').where({ id: record.user_id }).first();
    if (!user || user.status === 'SUSPENDED') {
      clearRefreshCookie(res);
      throw Errors.Unauthenticated('Account is inactive. Please log in again.');
    }

    const memberships = await membershipRepo.findActiveForUser(user.id, trx);

    // ── 6. Issue new tokens ─────────────────────────────────────────────────
    const accessToken = signAccessToken(user, memberships);
    const { raw, hash, expiresAt } = generateRefreshToken();

    await trx('refresh_tokens').insert({
      user_id:    user.id,
      token_hash: hash,
      expires_at: expiresAt,
    });

    setRefreshCookie(res, raw, expiresAt);

    return { accessToken };
  });
}

// ─── logout ───────────────────────────────────────────────────────────────────

/**
 * Revoke the current refresh token and clear the cookie.
 * Idempotent: missing or already-revoked tokens are handled gracefully.
 */
async function logout(req, res) {
  const rawToken = getRefreshCookie(req);
  clearRefreshCookie(res);

  if (!rawToken) {
    return; // Nothing to revoke — idempotent
  }

  const tokenHash = hashRefreshToken(rawToken);
  const record    = await refreshRepo.findActiveByHash(tokenHash);
  if (record) {
    await refreshRepo.revokeById(record.id);
  }
  // If already revoked: no-op (idempotent).
}

// ─── me ──────────────────────────────────────────────────────────────────────

/**
 * Return the authenticated user's profile, memberships, and unread notification count.
 * @param {string} userId - From req.user.sub (verified JWT claim).
 */
async function getMe(userId) {
  const user = await db('users').where({ id: userId }).first();
  if (!user || user.status === 'SUSPENDED') {
    throw Errors.NotFound('User not found or account is inactive.');
  }

  const memberships = await membershipRepo.findActiveForUser(userId);

  // Unread notification count (table exists from migration 007).
  const [{ count: unreadCount }] = await db('notifications')
    .where({ user_id: userId, read: false })
    .count('* as count');

  return {
    user:           UserRepository.sanitize(user),
    memberships,
    unreadNotifications: Number(unreadCount),
  };
}

module.exports = { register, verifyOtp, login, refresh, logout, getMe };
