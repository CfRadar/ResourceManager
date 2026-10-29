'use strict';

/**
 * src/modules/availability/availability.repository.js
 *
 * Data access repository for bookings overlap checking, blackout periods,
 * and availability polling.
 * Spec §4.7.
 */

const { db } = require('../../config/db');

class AvailabilityRepository {
  /**
   * Query active bookings overlapping the given interval [from, to).
   * Active statuses per spec §4.7: SCHEDULED, CHECKED_IN, IN_USE.
   */
  async findActiveBookingsInInterval(resourceId, from, to, trx = null) {
    const qb = trx ? trx('bookings') : db('bookings');
    return qb
      .where('resource_id', resourceId)
      .whereIn('status', ['SCHEDULED', 'CHECKED_IN', 'IN_USE'])
      .where('start_at', '<', to)
      .where('end_at', '>', from)
      .select('id', 'request_id', 'resource_id', 'user_id', 'start_at', 'end_at', 'status');
  }

  /**
   * Query active blackout periods overlapping the given interval [from, to).
   */
  async findActiveBlackoutsInInterval(resourceId, from, to, trx = null) {
    const qb = trx ? trx('blackout_periods') : db('blackout_periods');
    return qb
      .where('resource_id', resourceId)
      .whereNull('deleted_at')
      .where('start_at', '<', to)
      .where('end_at', '>', from)
      .select('id', 'resource_id', 'start_at', 'end_at', 'reason', 'created_by', 'created_at');
  }

  /**
   * Insert a new blackout period.
   */
  async insertBlackout(data, trx = null) {
    const qb = trx ? trx('blackout_periods') : db('blackout_periods');
    const [inserted] = await qb
      .insert({
        resource_id: data.resourceId,
        start_at:    data.startAt,
        end_at:      data.endAt,
        reason:      data.reason || 'Scheduled Maintenance',
        created_by:  data.createdBy,
      })
      .returning('*');
    return inserted;
  }

  /**
   * Find single active blackout by ID.
   */
  async findBlackoutById(blackoutId, trx = null) {
    const qb = trx ? trx('blackout_periods') : db('blackout_periods');
    return qb
      .where({ id: blackoutId })
      .whereNull('deleted_at')
      .first();
  }

  /**
   * Soft-delete a blackout period.
   */
  async softDeleteBlackout(blackoutId, resourceId, trx = null) {
    const qb = trx ? trx('blackout_periods') : db('blackout_periods');
    return qb
      .where({ id: blackoutId, resource_id: resourceId })
      .whereNull('deleted_at')
      .update({
        deleted_at: (trx || db).fn.now(),
      });
  }

  /**
   * Update the status of a set of bookings (e.g. to NEEDS_REBOOK on blackout collision).
   */
  async updateBookingsStatus(bookingIds, newStatus, trx = null) {
    if (!bookingIds || bookingIds.length === 0) return 0;
    const qb = trx ? trx('bookings') : db('bookings');
    return qb
      .whereIn('id', bookingIds)
      .update({
        status:     newStatus,
        updated_at: (trx || db).fn.now(),
      });
  }

  /**
   * Retrieve active availability polls for a resource.
   */
  async findActivePolls(resourceId, trx = null) {
    const qb = trx ? trx('availability_polls') : db('availability_polls');
    return qb
      .where({ resource_id: resourceId, active: true })
      .orderBy('created_at', 'desc')
      .select('id', 'resource_id', 'label', 'preferred_windows', 'vote_count', 'active', 'created_by', 'created_at');
  }

  /**
   * Insert a new availability poll.
   */
  async insertPoll(data, trx = null) {
    const qb = trx ? trx('availability_polls') : db('availability_polls');
    const [inserted] = await qb
      .insert({
        resource_id:       data.resourceId,
        created_by:        data.createdBy,
        label:             data.label,
        preferred_windows: data.preferredWindows ? JSON.stringify(data.preferredWindows) : null,
        vote_count:        1,
        active:            true,
      })
      .returning('*');
    return inserted;
  }

  /**
   * Find poll by ID.
   */
  async findPollById(pollId, trx = null) {
    const qb = trx ? trx('availability_polls') : db('availability_polls');
    return qb
      .where({ id: pollId, active: true })
      .first();
  }

  /**
   * Increment vote count on a poll.
   */
  async incrementPollVote(pollId, trx = null) {
    const qb = trx ? trx('availability_polls') : db('availability_polls');
    const [updated] = await qb
      .where({ id: pollId, active: true })
      .increment('vote_count', 1)
      .returning('*');
    return updated;
  }
}

const availabilityRepo = new AvailabilityRepository();

module.exports = {
  availabilityRepo,
  AvailabilityRepository,
};

