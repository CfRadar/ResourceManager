'use strict';

/**
 * src/middleware/rbac.js
 *
 * Role-based access control (RBAC) and institution-scope authorization.
 *
 * Design:
 *  - Works AFTER authenticate middleware (req.user must be set).
 *  - Roles from spec §2.1:
 *      REQUESTER | OWNER | MANAGER | OPERATOR | COORDINATOR | ADMIN
 *  - Institution-scope: Managers/Operators/Owners may act only on resources
 *    inside facilities where they hold that role (spec §2.2).
 *  - Returns standard 403 FORBIDDEN on role mismatch.
 *  - Does NOT invent undocumented role names or permissions.
 *
 * Usage:
 *   const { requireRole, requireInstitutionRole, requireAnyRole } = require('../middleware/rbac');
 *
 *   // Any of these platform-level roles:
 *   router.get('/admin-area', authenticate, requireRole('ADMIN'), handler);
 *
 *   // Institution-scoped role check (institutionId from req.params):
 *   router.post(
 *     '/institutions/:institutionId/members',
 *     authenticate,
 *     requireInstitutionRole('ADMIN'),
 *     handler
 *   );
 *
 *   // Accept any of several roles:
 *   router.get('/dashboard', authenticate, requireAnyRole(['MANAGER','OWNER','ADMIN']), handler);
 */

const { Errors } = require('../utils/AppError');

// ─── Canonical role list (spec §2.1) ─────────────────────────────────────────

const ROLES = Object.freeze({
  REQUESTER:   'REQUESTER',
  OWNER:       'OWNER',
  MANAGER:     'MANAGER',
  OPERATOR:    'OPERATOR',
  COORDINATOR: 'COORDINATOR',
  ADMIN:       'ADMIN',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Assert that req.user exists (authenticate must have run first).
 * @param {import('express').Request} req
 */
function assertAuthenticated(req) {
  if (!req.user) {
    throw Errors.Unauthenticated('Authentication required before authorization check.');
  }
}

/**
 * Find a membership record matching the given institutionId.
 * @param {Array<{institutionId: string, role: string}>} memberships
 * @param {string} institutionId
 * @returns {{ institutionId: string, role: string } | undefined}
 */
function findMembership(memberships, institutionId) {
  return memberships.find((m) => m.institutionId === institutionId);
}

// ─── requireRole (platform-level) ────────────────────────────────────────────

/**
 * Requires the user's platform-level role (req.user.role) to match exactly.
 *
 * @param {string} role - One of the ROLES constants.
 * @returns {import('express').RequestHandler}
 */
function requireRole(role) {
  return (req, _res, next) => {
    try {
      assertAuthenticated(req);
    } catch (err) {
      return next(err);
    }
    if (req.user.role !== role) {
      return next(Errors.Forbidden(`This action requires the '${role}' role.`));
    }
    return next();
  };
}

// ─── requireAnyRole ───────────────────────────────────────────────────────────

/**
 * Requires the user's platform-level role to be one of the allowed roles.
 *
 * @param {string[]} roles - Array of allowed role strings.
 * @returns {import('express').RequestHandler}
 */
function requireAnyRole(roles) {
  return (req, _res, next) => {
    try {
      assertAuthenticated(req);
    } catch (err) {
      return next(err);
    }
    if (!roles.includes(req.user.role)) {
      return next(
        Errors.Forbidden(
          `This action requires one of the following roles: ${roles.join(', ')}.`
        )
      );
    }
    return next();
  };
}

// ─── requireInstitutionRole ───────────────────────────────────────────────────

/**
 * Requires the user to hold a specific role within a given institution.
 * The institutionId is read from req.params.institutionId by default.
 *
 * Spec §2.2: Managers/Operators/Owners may only act on resources inside
 * facilities where they hold that role.
 *
 * @param {string|string[]} role          - Required institution-level role(s).
 * @param {string}          [paramKey]    - req.params key for institution ID (default: 'institutionId').
 * @returns {import('express').RequestHandler}
 */
function requireInstitutionRole(role, paramKey = 'institutionId') {
  const allowed = Array.isArray(role) ? role : [role];

  return (req, _res, next) => {
    try {
      assertAuthenticated(req);
    } catch (err) {
      return next(err);
    }

    // Platform-level ADMINs pass all institution-scope checks.
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    const institutionId = req.params[paramKey];
    if (!institutionId) {
      return next(
        Errors.Forbidden(
          `Institution ID not found in route parameter '${paramKey}'.`
        )
      );
    }

    const membership = findMembership(req.user.memberships, institutionId);
    if (!membership || !allowed.includes(membership.role)) {
      return next(
        Errors.Forbidden(
          `This action requires the '${allowed.join(' or ')}' role within institution ${institutionId}.`
        )
      );
    }

    // Attach the matched membership context for downstream use.
    req.institutionMembership = membership;
    return next();
  };
}

// ─── requireSelf ──────────────────────────────────────────────────────────────

/**
 * Requires the authenticated user to be acting on their own resource.
 * Useful for endpoints like PATCH /users/me or GET /bookings/mine.
 *
 * @param {string} [paramKey] - req.params key holding the target user ID (default: 'userId').
 * @returns {import('express').RequestHandler}
 */
function requireSelf(paramKey = 'userId') {
  return (req, _res, next) => {
    try {
      assertAuthenticated(req);
    } catch (err) {
      return next(err);
    }
    const targetId = req.params[paramKey];
    if (targetId && req.user.sub !== targetId) {
      return next(Errors.Forbidden('You may only perform this action on your own account.'));
    }
    return next();
  };
}

// ─── assertNoSelfApproval ────────────────────────────────────────────────────

/**
 * Strict no-self-approval rule (spec §2.2 / Step 02).
 * Call inside any review, approval, or incident-resolution handler.
 *
 * Both IDs MUST come from trusted database records or authenticated identity
 * — never from raw req.body or query parameters.
 *
 * @param {string} reviewerId   - ID of the person taking the action.
 * @param {string} requesterId  - ID of the person who created the request.
 * @throws {AppError} FORBIDDEN if the IDs match.
 */
function assertNoSelfApproval(reviewerId, requesterId) {
  if (!reviewerId || !requesterId) {
    // Missing IDs are a programmer error, not an auth error. Fail closed.
    throw Errors.Forbidden('Self-approval check: both reviewer and requester IDs are required.');
  }
  if (String(reviewerId) === String(requesterId)) {
    throw Errors.Forbidden(
      'Self-review is strictly prohibited. An independent reviewer must decide.'
    );
  }
}

module.exports = {
  ROLES,
  requireRole,
  requireAnyRole,
  requireInstitutionRole,
  requireSelf,
  assertNoSelfApproval,
};
