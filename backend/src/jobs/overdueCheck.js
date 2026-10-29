'use strict';

/**
 * src/jobs/overdueCheck.js
 *
 * Spec §5.3 & §4.12: Flags active bookings as OVERDUE when now > endAt + graceMinutes.
 */

const { db } = require('../config/db');
const { BOOKING } = require('../config/constants');
const { transition } = require('../services/transition');
const notificationsService = require('../modules/notifications/notifications.service');

const SYSTEM_ACTOR = {
  sub:  '00000000-0000-0000-0000-000000000000',
  role: 'PLATFORM_ADMIN',
};

async function runOverdueCheck() {
  const graceMinutes = BOOKING.LATE_RETURN_GRACE || 15;
  const overdueCutoff = new Date(Date.now() - graceMinutes * 60 * 1000);

  const overdueBookings = await db('bookings')
    .whereIn('status', ['CHECKED_IN', 'IN_USE'])
    .andWhere('end_at', '<', overdueCutoff);

  let markedOverdue = 0;

  for (const b of overdueBookings) {
    try {
      await transition(
        'Booking',
        b.id,
        'OVERDUE',
        SYSTEM_ACTOR,
        `Automatic overdue transition: booking exceeded return grace period (${graceMinutes} mins)`
      );

      // Notify booking user
      await notificationsService.createNotification({
        userId:    b.user_id,
        eventType: 'BOOKING_OVERDUE',
        title:     'Booking Overdue',
        body:      `Your booking ended at ${new Date(b.end_at).toLocaleTimeString()} and is now overdue. Please complete check-out immediately to prevent late penalties.`,
        actionLink: { label: 'Return Equipment', url: `/bookings/${b.id}` },
        meta:      { bookingId: b.id, resourceId: b.resource_id },
      });

      markedOverdue++;
    } catch (err) {
      console.error(`[overdueCheck] Failed to transition booking ${b.id}:`, err.message);
    }
  }

  return { markedOverdue };
}

module.exports = { runOverdueCheck, SYSTEM_ACTOR };

