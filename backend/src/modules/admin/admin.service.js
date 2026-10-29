'use strict';

/**
 * src/modules/admin/admin.service.js
 *
 * System administration operations (Spec §4.23).
 */

const { db } = require('../../config/db');
const { Errors } = require('../../utils/AppError');
const { appendAuditEvent } = require('../../services/auditChain');
const scheduler = require('../../services/scheduler');
const demoSeed = require('../../../seeds/001_demo_data');

class AdminService {
  /**
   * Search users across institutions with role and status filtering.
   */
  async listUsers(actor, filters = {}) {
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const adminMemberships = (actor.memberships || []).filter((m) => m.role === 'ADMIN');

    if (!isPlatformAdmin && adminMemberships.length === 0) {
      throw Errors.Forbidden('Only administrators may view user listings.');
    }

    const { institutionId, query, role, status, page = 1, pageSize = 20 } = filters;
    const offset = (Math.max(1, page) - 1) * pageSize;

    let baseQuery = db('users')
      .leftJoin('institution_memberships', 'users.id', 'institution_memberships.user_id')
      .select(
        'users.id',
        'users.email',
        'users.name',
        'users.status',
        'users.platform_role',
        'users.created_at',
        'institution_memberships.institution_id',
        'institution_memberships.role as institution_role'
      );

    if (!isPlatformAdmin) {
      const allowedInstIds = adminMemberships.map((m) => m.institutionId);
      baseQuery = baseQuery.whereIn('institution_memberships.institution_id', allowedInstIds);
    } else if (institutionId) {
      baseQuery = baseQuery.where('institution_memberships.institution_id', institutionId);
    }

    if (query) {
      baseQuery = baseQuery.where(function () {
        this.whereILike('users.name', `%${query}%`)
          .orWhereILike('users.email', `%${query}%`);
      });
    }

    if (role) {
      baseQuery = baseQuery.where('institution_memberships.role', role);
    }

    if (status) {
      baseQuery = baseQuery.where('users.status', status);
    }

    const [countResult] = await baseQuery.clone().countDistinct('users.id as total');
    const total = parseInt(countResult?.total || '0', 10);

    const users = await baseQuery
      .distinctOn('users.id')
      .orderBy('users.id')
      .limit(pageSize)
      .offset(offset);

    return {
      items: users,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Suspends a user account and records an immutable audit event.
   */
  async suspendUser(targetUserId, actor, reason) {
    if (targetUserId === actor.sub) {
      throw Errors.BadRequest('Administrators cannot suspend their own account.');
    }

    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isInstAdmin = (actor.memberships || []).some((m) => m.role === 'ADMIN');

    if (!isPlatformAdmin && !isInstAdmin) {
      throw Errors.Forbidden('Only administrators may suspend user accounts.');
    }

    const targetUser = await db('users').where({ id: targetUserId }).first();
    if (!targetUser) {
      throw Errors.NotFound('User not found.');
    }

    await db('users')
      .where({ id: targetUserId })
      .update({
        status:     'SUSPENDED',
        updated_at: new Date(),
      });

    const updated = await db('users').where({ id: targetUserId }).first();

    await appendAuditEvent({
      actorId:    actor.sub,
      actorRole:  actor.role,
      action:     'USER_SUSPENDED',
      entityType: 'User',
      entityId:   targetUserId,
      reason,
      visibility: 'INTERNAL',
      payload:    { before: { status: targetUser.status }, after: { status: 'SUSPENDED' }, reason },
    });

    return updated || { id: targetUserId, status: 'SUSPENDED' };
  }

  /**
   * Returns background job status and history.
   */
  async getSchedulerJobs(actor) {
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some((m) =>
      ['ADMIN', 'MANAGER', 'OWNER'].includes(m.role)
    );

    if (!isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('Only administrators or staff may view scheduler jobs.');
    }

    return scheduler.getJobStatus();
  }

  /**
   * Triggers an on-demand background job run.
   */
  async triggerJob(jobName, actor) {
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some((m) =>
      ['ADMIN', 'MANAGER', 'OWNER'].includes(m.role)
    );

    if (!isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('Only administrators or staff may trigger background jobs.');
    }

    const result = await scheduler.runJob(jobName);
    return result;
  }

  /**
   * Seeds demo data (platform admin and non-production only).
   */
  async seedDemo(actor) {
    if (process.env.NODE_ENV === 'production') {
      throw Errors.Forbidden('Demo seeding is disabled in production.');
    }

    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isInstAdmin = (actor.memberships || []).some((m) => m.role === 'ADMIN');

    if (!isPlatformAdmin && !isInstAdmin) {
      throw Errors.Forbidden('Only administrators may execute demo seeding.');
    }

    await demoSeed.seed(db);

    return {
      message: 'Demo dataset loaded successfully.',
      demo:    true,
    };
  }
}

module.exports = new AdminService();
