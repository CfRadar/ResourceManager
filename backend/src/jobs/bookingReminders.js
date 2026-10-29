'use strict';

/**
 * src/jobs/bookingReminders.js
 *
 * Spec §5.3: Dispatches reminders 24h and 1h prior to booking start,
 * and 30m prior to booking end.
 */

const { db } = require('../config/db');
const notificationsService = require('../modules/notifications/notifications.service');

async function runBookingReminders() {
  const now = new Date();
  let remindersSent = 0;

  // 1. 24h Reminder (between 23h and 25h from now)
  const window24Start = new Date(now.getTime() + 23 * 3600 * 1000);
  const window24End   = new Date(now.getTime() + 25 * 3600 * 1000);

  const bookings24 = await db('bookings')
    .where('status', 'SCHEDULED')
    .andWhere('start_at', '>=', window24Start)
    .andWhere('start_at', '<=', window24End);

  for (const b of bookings24) {
    const existing = await db('notifications')
      .where({
        user_id:    b.user_id,
        event_type: 'BOOKING_REMINDER_24H',
      })
      .andWhereRaw(`meta->>'bookingId' = ?`, [b.id])
      .first();

    if (!existing) {
      await notificationsService.createNotification({
        userId:    b.user_id,
        eventType: 'BOOKING_REMINDER_24H',
        title:     'Upcoming Booking in 24 Hours',
        body:      `Your booking for resource starts tomorrow at ${new Date(b.start_at).toLocaleTimeString()}.`,
        actionLink: { label: 'View Booking', url: `/bookings/${b.id}` },
        meta:      { bookingId: b.id, resourceId: b.resource_id },
      });
      remindersSent++;
    }
  }

  // 2. 1h Reminder (between 50m and 70m from now)
  const window1Start = new Date(now.getTime() + 50 * 60 * 1000);
  const window1End   = new Date(now.getTime() + 70 * 60 * 1000);

  const bookings1 = await db('bookings')
    .where('status', 'SCHEDULED')
    .andWhere('start_at', '>=', window1Start)
    .andWhere('start_at', '<=', window1End);

  for (const b of bookings1) {
    const existing = await db('notifications')
      .where({
        user_id:    b.user_id,
        event_type: 'BOOKING_REMINDER_1H',
      })
      .andWhereRaw(`meta->>'bookingId' = ?`, [b.id])
      .first();

    if (!existing) {
      await notificationsService.createNotification({
        userId:    b.user_id,
        eventType: 'BOOKING_REMINDER_1H',
        title:     'Upcoming Booking in 1 Hour',
        body:      `Your booking starts soon at ${new Date(b.start_at).toLocaleTimeString()}. Remember to check in!`,
        actionLink: { label: 'Check In', url: `/bookings/${b.id}` },
        meta:      { bookingId: b.id, resourceId: b.resource_id },
      });
      remindersSent++;
    }
  }

  // 3. 30m before end reminder (between 25m and 35m before end)
  const windowEndStart = new Date(now.getTime() + 25 * 60 * 1000);
  const windowEndEnd   = new Date(now.getTime() + 35 * 60 * 1000);

  const bookingsEnding = await db('bookings')
    .whereIn('status', ['CHECKED_IN', 'IN_USE'])
    .andWhere('end_at', '>=', windowEndStart)
    .andWhere('end_at', '<=', windowEndEnd);

  for (const b of bookingsEnding) {
    const existing = await db('notifications')
      .where({
        user_id:    b.user_id,
        event_type: 'BOOKING_REMINDER_END_30M',
      })
      .andWhereRaw(`meta->>'bookingId' = ?`, [b.id])
      .first();

    if (!existing) {
      await notificationsService.createNotification({
        userId:    b.user_id,
        eventType: 'BOOKING_REMINDER_END_30M',
        title:     'Booking Finishing in 30 Minutes',
        body:      `Your active booking ends at ${new Date(b.end_at).toLocaleTimeString()}. Please prepare to check out.`,
        actionLink: { label: 'Check Out', url: `/bookings/${b.id}` },
        meta:      { bookingId: b.id, resourceId: b.resource_id },
      });
      remindersSent++;
    }
  }

  return { remindersSent };
}

module.exports = { runBookingReminders };

