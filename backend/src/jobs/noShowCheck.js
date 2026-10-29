'use strict';

/**
 * src/jobs/noShowCheck.js
 *
 * Spec §5.3 & §4.12: Identifies bookings where user failed to check in within grace period.
 */

const { db } = require('../config/db');
const { BOOKING } = require('../config/constants');
const notificationsService = require('../modules/notifications/notifications.service');

async function runNoShowCheck() {
  const graceMinutes = BOOKING.NO_SHOW_GRACE_MIN || 15;
  const cutoff = new Date(Date.now() - graceMinutes * 60 * 1000);

  // Scheduled bookings whose start_at is in the past beyond grace period
  const unCheckedIn = await db('bookings')
    .where('status', 'SCHEDULED')
    .andWhere('start_at', '<', cutoff);

  let flaggedCount = 0;

  for (const b of unCheckedIn) {
    // Check if notification already dispatched
    const existing = await db('notifications')
      .where({
        user_id:    b.user_id,
        event_type: 'BOOKING_NO_SHOW_WARNING',
      })
      .andWhereRaw(`meta->>'bookingId' = ?`, [b.id])
      .first();

    if (!existing) {
      await notificationsService.createNotification({
        userId:    b.user_id,
        eventType: 'BOOKING_NO_SHOW_WARNING',
        title:     'Check-in Window Missed',
        body:      `You have not checked in for your scheduled booking. It may be marked as a no-show by facility staff.`,
        actionLink: { label: 'View Booking', url: `/bookings/${b.id}` },
        meta:      { bookingId: b.id, resourceId: b.resource_id },
      });
      flaggedCount++;
    }
  }

  return { flaggedCount };
}

module.exports = { runNoShowCheck };

