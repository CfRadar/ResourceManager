'use strict';

/**
 * src/modules/dashboards/dashboards.service.js
 *
 * Role-specific dashboard aggregations and analytics (Spec §4.21).
 */

const { db } = require('../../config/db');
const tokenService = require('../../services/tokenService');
const { getLatestIntegrityStatus } = require('../../jobs/auditIntegrityCheck');

class DashboardsService {
  /**
   * Requester Dashboard: Next booking, pending requests, token balance, unread notifications.
   */
  async getRequesterDashboard(userId) {
    const now = new Date();

    const [nextBooking, pendingRequestsCount, unreadNotifsCount, tokenBalance] = await Promise.all([
      db('bookings')
        .where({ user_id: userId })
        .whereIn('status', ['SCHEDULED', 'CHECKED_IN', 'IN_USE'])
        .andWhere('end_at', '>=', now)
        .orderBy('start_at', 'asc')
        .first(),

      db('access_requests')
        .where({ user_id: userId })
        .whereIn('status', ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'WAITLISTED'])
        .count('* as count'),

      db('notifications')
        .where({ user_id: userId, read: false })
        .count('* as count'),

      tokenService.balance(userId).catch(() => ({ availableTokens: 100 })),
    ]);

    return {
      nextBooking:            nextBooking || null,
      pendingRequestsCount:   parseInt(pendingRequestsCount[0]?.count || '0', 10),
      unreadNotificationsCount: parseInt(unreadNotifsCount[0]?.count || '0', 10),
      tokenBalance,
    };
  }

  /**
   * Facility / Lab Manager Dashboard: Queue counts, today's schedule, overdue equipment, incidents.
   */
  async getManagerDashboard(actor) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [
      pendingAccessRequests,
      pendingServiceRequests,
      activeIncidents,
      todayBookings,
      overdueBookings,
    ] = await Promise.all([
      db('access_requests')
        .whereIn('status', ['SUBMITTED', 'UNDER_REVIEW'])
        .count('* as count'),

      db('service_requests')
        .whereIn('status', ['SUBMITTED', 'SCOPE_REVIEW', 'QUOTE_SENT'])
        .count('* as count'),

      db('incidents')
        .whereIn('status', ['REPORTED', 'UNDER_REVIEW', 'INFO_REQUESTED'])
        .count('* as count'),

      db('bookings')
        .where('start_at', '>=', startOfDay)
        .andWhere('start_at', '<=', endOfDay)
        .count('* as count'),

      db('bookings')
        .where('status', 'OVERDUE')
        .count('* as count'),
    ]);

    return {
      queueCounts: {
        pendingAccessRequests:  parseInt(pendingAccessRequests[0]?.count || '0', 10),
        pendingServiceRequests: parseInt(pendingServiceRequests[0]?.count || '0', 10),
        activeIncidents:        parseInt(activeIncidents[0]?.count || '0', 10),
      },
      todayBookingsCount: parseInt(todayBookings[0]?.count || '0', 10),
      overdueCount:       parseInt(overdueBookings[0]?.count || '0', 10),
    };
  }

  /**
   * Network Coordinator Dashboard: Open needs, referrals by status.
   */
  async getCoordinatorDashboard(_actor) {
    const [openNeeds, referralsSummary] = await Promise.all([
      db('need_requests')
        .whereIn('status', ['SUBMITTED', 'UNDER_COORDINATOR_REVIEW', 'CANDIDATE_IDENTIFIED'])
        .count('* as count'),

      db('referrals')
        .select('status')
        .count('* as count')
        .groupBy('status'),
    ]);

    const referralCounts = {};
    for (const r of referralsSummary) {
      referralCounts[r.status] = parseInt(r.count, 10);
    }

    return {
      openNeedRequestsCount: parseInt(openNeeds[0]?.count || '0', 10),
      referralStatusCounts:  referralCounts,
    };
  }

  /**
   * Institutional Administrator Dashboard: Member counts, resource count, audit integrity.
   */
  async getAdminDashboard(actor) {
    const [memberCount, resourceCount, facilityCount, totalIncidents] = await Promise.all([
      db('institution_memberships').count('* as count'),
      db('resources').where({ status: 'ACTIVE' }).count('* as count'),
      db('facilities').count('* as count'),
      db('incidents').count('* as count'),
    ]);

    const auditIntegrity = getLatestIntegrityStatus();

    return {
      membersCount:     parseInt(memberCount[0]?.count || '0', 10),
      resourcesCount:   parseInt(resourceCount[0]?.count || '0', 10),
      facilitiesCount:  parseInt(facilityCount[0]?.count || '0', 10),
      totalIncidents:   parseInt(totalIncidents[0]?.count || '0', 10),
      auditIntegrity:   auditIntegrity || { valid: true },
    };
  }

  /**
   * Analytics: Resource utilization (hours booked vs available).
   */
  async getUtilisationAnalytics({ resourceId, from, to } = {}) {
    let query = db('bookings').whereIn('status', ['CHECKED_IN', 'IN_USE', 'RETURNED', 'CLOSED']);

    if (resourceId) {
      query = query.where({ resource_id: resourceId });
    }
    if (from) {
      query = query.where('start_at', '>=', new Date(from));
    }
    if (to) {
      query = query.where('end_at', '<=', new Date(to));
    }

    const bookings = await query.select('id', 'resource_id', 'start_at', 'end_at');

    let totalMinutesBooked = 0;
    for (const b of bookings) {
      const durMs = new Date(b.end_at).getTime() - new Date(b.start_at).getTime();
      if (durMs > 0) totalMinutesBooked += Math.round(durMs / (60 * 1000));
    }

    return {
      totalBookings:      bookings.length,
      totalHoursUtilised: Math.round((totalMinutesBooked / 60) * 10) / 10,
      resourceId:         resourceId || null,
      from:               from || null,
      to:                 to || null,
    };
  }

  /**
   * Analytics: Demand analysis (waitlist lengths, unfulfilled requests).
   */
  async getDemandAnalytics({ resourceId } = {}) {
    let waitlistQuery = db('waitlist_entries').whereIn('status', ['PENDING', 'OFFERED']);
    if (resourceId) {
      waitlistQuery = waitlistQuery.where({ resource_id: resourceId });
    }

    const [waitlistCount, unfulfilledRequests] = await Promise.all([
      waitlistQuery.count('* as count'),
      db('access_requests')
        .whereIn('status', ['REJECTED', 'WAITLISTED', 'CANCELLED'])
        .count('* as count'),
    ]);

    return {
      activeWaitlistCount: parseInt(waitlistCount[0]?.count || '0', 10),
      unfulfilledRequests: parseInt(unfulfilledRequests[0]?.count || '0', 10),
      resourceId:          resourceId || null,
    };
  }
}

module.exports = new DashboardsService();

