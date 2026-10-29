'use strict';

/**
 * src/modules/availability/availability.service.js
 *
 * Business logic for availability windows, discrete slot suggestions,
 * blackout creation and collision gating, and availability polls.
 * Spec §4.7.
 */

const { availabilityRepo } = require('./availability.repository');
const { resourceRepo }     = require('../resources/resources.repository');
const { facilityRepo }     = require('../facilities/facilities.repository');
const { policyRepo }       = require('../policies/policies.repository');
const { db }               = require('../../config/db');
const { Errors, AppError } = require('../../utils/AppError');
const { ROLES }            = require('../../middleware/rbac');
const {
  calculateAvailabilityIntervals,
  getSuggestedSlots,
  zonedTimeToUtc,
} = require('../../services/bookingEngine');

class AvailabilityService {
  /**
   * Helper: checks if user is platform admin or manager/owner of the institution.
   */
  _assertCanManageSchedule(facility, userContext) {
    if (!userContext) {
      throw Errors.Unauthorized('Authentication required.');
    }
    if (userContext.role === ROLES.PLATFORM_ADMIN) {
      return true;
    }

    const hostInstId = facility.institution_id || facility.institutionId;
    const isAuthorized = Array.isArray(userContext.memberships) && userContext.memberships.some(
      (m) => m.institutionId === hostInstId &&
             (m.role === ROLES.ADMIN || m.role === ROLES.OWNER || m.role === ROLES.MANAGER)
    );

    if (!isAuthorized) {
      throw Errors.Forbidden('Only institution managers, owners, or platform administrators can modify schedule blackouts.');
    }
    return true;
  }

  /**
   * GET /resources/:id/availability?from=&to=
   * Returns merged open, busy (anonymized), and blackout intervals.
   */
  async getAvailability(resourceId, { from, to }, userContext = null) {
    const resource = await resourceRepo.findById(resourceId);
    if (!resource || resource.status !== 'ACTIVE') {
      throw Errors.NotFound('Resource not found or is currently inactive.');
    }

    const facility = await facilityRepo.findById(resource.facility_id);
    if (!facility) {
      throw Errors.NotFound('Resource facility not found.');
    }

    const [bookings, blackouts] = await Promise.all([
      availabilityRepo.findActiveBookingsInInterval(resourceId, from, to),
      availabilityRepo.findActiveBlackoutsInInterval(resourceId, from, to),
    ]);

    const intervals = calculateAvailabilityIntervals(facility, bookings, blackouts, from, to);

    return {
      resourceId,
      from,
      to,
      intervals,
    };
  }

  /**
   * GET /resources/:id/slots?date=&durationMin=
   * Returns bookable slot suggestions for the requested date.
   */
  async getSlots(resourceId, { date, durationMin }, userContext = null) {
    const resource = await resourceRepo.findById(resourceId);
    if (!resource || resource.status !== 'ACTIVE') {
      throw Errors.NotFound('Resource not found or is currently inactive.');
    }

    const facility = await facilityRepo.findById(resource.facility_id);
    if (!facility) {
      throw Errors.NotFound('Resource facility not found.');
    }

    const policy = await policyRepo.findCurrentPolicy(resourceId);
    const policyData = policy?.policy_data ? (
      typeof policy.policy_data === 'string' ? JSON.parse(policy.policy_data) : policy.policy_data
    ) : {};

    const tz = facility.timezone || 'UTC';
    const dayStart = zonedTimeToUtc(date, '00:00', tz).toISOString();
    const dayEnd   = zonedTimeToUtc(date, '23:59', tz).toISOString();

    const [bookings, blackouts] = await Promise.all([
      availabilityRepo.findActiveBookingsInInterval(resourceId, dayStart, dayEnd),
      availabilityRepo.findActiveBlackoutsInInterval(resourceId, dayStart, dayEnd),
    ]);

    const slots = getSuggestedSlots(facility, policyData, bookings, blackouts, date, durationMin);

    return {
      resourceId,
      date,
      durationMin,
      slots,
    };
  }

  /**
   * POST /resources/:id/blackouts
   * Adds a blackout window. Gated by collision check unless confirmCancelAffected: true.
   */
  async createBlackout(resourceId, data, userContext) {
    const resource = await resourceRepo.findById(resourceId);
    if (!resource) {
      throw Errors.NotFound('Resource not found.');
    }

    const facility = await facilityRepo.findById(resource.facility_id);
    if (!facility) {
      throw Errors.NotFound('Resource facility not found.');
    }

    this._assertCanManageSchedule(facility, userContext);

    // Check collision with existing active bookings
    const collidingBookings = await availabilityRepo.findActiveBookingsInInterval(
      resourceId,
      data.startAt,
      data.endAt
    );

    if (collidingBookings.length > 0) {
      if (!data.confirmCancelAffected) {
        throw new AppError(
          'BOOKING_CONFLICT',
          'Blackout period collides with existing active bookings. Set confirmCancelAffected: true to confirm cancellation/rescheduling.',
          409,
          {
            affectedBookings: collidingBookings.map((b) => ({
              id:      b.id,
              userId:  b.user_id,
              startAt: b.start_at,
              endAt:   b.end_at,
              status:  b.status,
            })),
          }
        );
      }

      // If confirmCancelAffected is true, execute in transaction:
      // Transition colliding bookings to NEEDS_REBOOK and insert blackout
      return db.transaction(async (trx) => {
        const bookingIds = collidingBookings.map((b) => b.id);
        await availabilityRepo.updateBookingsStatus(bookingIds, 'NEEDS_REBOOK', trx);

        const blackout = await availabilityRepo.insertBlackout({
          resourceId,
          startAt:   data.startAt,
          endAt:     data.endAt,
          reason:    data.reason,
          createdBy: userContext.sub,
        }, trx);

        return {
          ...blackout,
          affectedBookingsCount: collidingBookings.length,
          affectedBookingIds:    bookingIds,
        };
      });
    }

    // No collisions: insert directly
    const blackout = await availabilityRepo.insertBlackout({
      resourceId,
      startAt:   data.startAt,
      endAt:     data.endAt,
      reason:    data.reason,
      createdBy: userContext.sub,
    });

    return blackout;
  }

  /**
   * DELETE /resources/:id/blackouts/:blackoutId
   */
  async deleteBlackout(resourceId, blackoutId, userContext) {
    const resource = await resourceRepo.findById(resourceId);
    if (!resource) {
      throw Errors.NotFound('Resource not found.');
    }

    const facility = await facilityRepo.findById(resource.facility_id);
    if (!facility) {
      throw Errors.NotFound('Resource facility not found.');
    }

    this._assertCanManageSchedule(facility, userContext);

    const affected = await availabilityRepo.softDeleteBlackout(blackoutId, resourceId);
    if (!affected) {
      throw Errors.NotFound('Blackout period not found or already deleted.');
    }

    return {
      id:      blackoutId,
      message: 'Blackout period cancelled successfully.',
    };
  }

  /**
   * GET /resources/:id/availability-polls
   */
  async listPolls(resourceId, userContext = null) {
    const resource = await resourceRepo.findById(resourceId);
    if (!resource) {
      throw Errors.NotFound('Resource not found.');
    }

    const polls = await availabilityRepo.findActivePolls(resourceId);
    return {
      resourceId,
      polls: polls.map((p) => {
        let preferredWindows = p.preferred_windows;
        if (typeof preferredWindows === 'string') {
          try { preferredWindows = JSON.parse(preferredWindows); } catch { preferredWindows = null; }
        }
        return {
          id:               p.id,
          resourceId:       p.resource_id,
          label:            p.label,
          preferredWindows: preferredWindows || [],
          voteCount:        p.vote_count,
          active:           Boolean(p.active),
          createdBy:        p.created_by,
          createdAt:        p.created_at,
        };
      }),
    };
  }

  /**
   * POST /resources/:id/availability-polls
   */
  async createPoll(resourceId, data, userContext) {
    if (!userContext) {
      throw Errors.Unauthorized('Authentication required to create an availability poll.');
    }

    const resource = await resourceRepo.findById(resourceId);
    if (!resource) {
      throw Errors.NotFound('Resource not found.');
    }

    const poll = await availabilityRepo.insertPoll({
      resourceId,
      createdBy:        userContext.sub,
      label:            data.label,
      preferredWindows: data.preferredWindows,
    });

    return {
      id:               poll.id,
      resourceId:       poll.resource_id,
      label:            poll.label,
      preferredWindows: data.preferredWindows || [],
      voteCount:        poll.vote_count,
      active:           Boolean(poll.active),
      createdAt:        poll.created_at,
    };
  }

  /**
   * POST /availability-polls/:pollId/vote
   */
  async votePoll(pollId, userContext) {
    if (!userContext) {
      throw Errors.Unauthorized('Authentication required to vote on an availability poll.');
    }

    const poll = await availabilityRepo.findPollById(pollId);
    if (!poll) {
      throw Errors.NotFound('Availability poll not found or is closed.');
    }

    const updated = await availabilityRepo.incrementPollVote(pollId);
    return {
      id:        pollId,
      voteCount: updated.vote_count,
      message:   'Vote recorded successfully.',
    };
  }
}

const availabilityService = new AvailabilityService();

module.exports = {
  availabilityService,
  AvailabilityService,
};

