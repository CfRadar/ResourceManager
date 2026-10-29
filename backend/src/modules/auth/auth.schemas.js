'use strict';

/**
 * src/modules/auth/auth.schemas.js
 *
 * Zod input schemas for all /api/v1/auth endpoints.
 * Validated via the existing `validate` middleware factory.
 */

const { z } = require('zod');

// ── Register ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .email('Must be a valid email address.')
    .max(254, 'Email must not exceed 254 characters.')
    .transform((e) => e.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must not exceed 128 characters.'),
  name: z
    .string({ required_error: 'Name is required.' })
    .min(2, 'Name must be at least 2 characters.')
    .max(255, 'Name must not exceed 255 characters.')
    .trim(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-().]{6,32}$/, 'Phone number format is invalid.')
    .optional(),
});

// ── Verify OTP ────────────────────────────────────────────────────────────────

const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .email()
    .transform((e) => e.toLowerCase().trim()),
  otp: z
    .string({ required_error: 'OTP is required.' })
    .length(6, 'OTP must be exactly 6 digits.')
    .regex(/^\d{6}$/, 'OTP must contain only digits.'),
});

// ── Login ─────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .email()
    .transform((e) => e.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password is required.'),
});

module.exports = { registerSchema, verifyOtpSchema, loginSchema };
