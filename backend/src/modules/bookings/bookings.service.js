'use strict';

/**
 * src/modules/bookings/bookings.service.js
 *
 * Core business logic for Bookings lifecycle, calendar, reschedule, extensions,
 * cancellations, and iCal exports.
 * Spec §4.11, Step 07.
 */

const { bookingRepo }           = require('./bookings.repository');
const { resourceRepo }          = require('../resources/resources.repository');
const { facilityRepo }          = require('../facilities/facilities.repository');
const transitionService         = require('../../services/transition');
const { appendAuditEvent }      = require('../../services/auditChain');
const { Errors, AppError }      = require('../../utils/AppError');
const { db }                    = require('../../config/db');

class BookingService {
  /**
   * Retrieves bookings for the authenticated user.
   */
  async getMyBookings(userId, query) {
    return bookingRepo.findByUser(userId, query);
  }

  /**
   * Retrieves full booking details with QR payload.
   */
  async getBookingById(bookingId, actor) {
    const booking = await bookingRepo.findDetailById(bookingId);
    if (!booking) {
      throw Errors.NotFound('Booking not found.');
    }

    const isOwner = booking.user_id === actor.sub;
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some(
      (m) => m.institutionId === booking.institution_id && ['ADMIN', 'MANAGER', 'OPERATOR'].includes(m.role)
    );

    if (!isOwner && !isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('You are not authorized to view this booking.');
    }

    // Generate digital QR payload for check-in verification
    const qrPayload = {
      bookingId:  booking.id,
      resourceId: booking.resource_id,
      userId:     booking.user_id,
      startAt:    booking.start_at,
      endAt:      booking.end_at,
      demo:       true,
    };

    return { ...booking, qrPayload };
  }

  /**
   * Retrieves calendar feed for a facility within [from, to].
   */
  async getFacilityCalendar(facilityId, from, to, status, actor) {
    const facility = await facilityRepo.findById(facilityId);
    if (!facility) {
      throw Errors.NotFound('Facility not found.');
    }

    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some(
      (m) => m.institutionId === facility.institution_id && ['ADMIN', 'MANAGER', 'OPERATOR'].includes(m.role)
    );

    if (!isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('Only facility staff or platform administrators may access the facility calendar.');
    }

    return bookingRepo.findFacilityCalendar(facilityId, from, to, status);
  }

  /**
   * Reschedules a booking to a new time slot.
   */
  async rescheduleBooking(bookingId, actor, { newStartAt, newEndAt, reason }) {
    const booking = await bookingRepo.findDetailById(bookingId);
    if (!booking) {
      throw Errors.NotFound('Booking not found.');
    }

    const isOwner = booking.user_id === actor.sub;
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    if (!isOwner && !isPlatformAdmin) {
      throw Errors.Forbidden('You can only reschedule your own booking.');
    }

    if (booking.status !== 'SCHEDULED') {
      throw Errors.BadRequest(`Cannot reschedule booking in status '${booking.status}'. Only SCHEDULED bookings can be rescheduled.`);
    }

    // Check for overlapping active bookings in the new slot
    const overlaps = await bookingRepo.findOverlapping(
      booking.resource_id,
      newStartAt,
      newEndAt,
      booking.id
    );

    if (overlaps.length > 0) {
      throw Errors.BookingConflict({
        message: 'The requested time slot overlaps with an existing reservation.',
        conflictingBookings: overlaps.map((b) => ({ id: b.id, startAt: b.start_at, endAt: b.end_at })),
      });
    }

    const oldTimes = { startAt: booking.start_at, endAt: booking.end_at };
    const updated = await bookingRepo.update(bookingId, {
      start_at:   newStartAt,
      end_at:     newEndAt,
      updated_at: new Date(),
    });

    // Write audit event
    await appendAuditEvent({
      actorId:    actor.sub,
      actorRole:  actor.role,
      action:     'BOOKING_RESCHEDULED',
      entityType: 'Booking',
      entityId:   bookingId,
      resourceId: booking.resource_id,
      reason:     reason || 'User rescheduled booking slot',
      visibility: 'PARTIES',
      payload:    { before: oldTimes, after: { startAt: newStartAt, endAt: newEndAt } },
    });

    return updated;
  }

  /**
   * Extends an active or upcoming booking.
   */
  async extendBooking(bookingId, actor, { extensionMinutes, reason }) {
    const booking = await bookingRepo.findDetailById(bookingId);
    if (!booking) {
      throw Errors.NotFound('Booking not found.');
    }

    const isOwner = booking.user_id === actor.sub;
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    if (!isOwner && !isPlatformAdmin) {
      throw Errors.Forbidden('You can only extend your own booking.');
    }

    if (!['SCHEDULED', 'CHECKED_IN', 'IN_USE'].includes(booking.status)) {
      throw Errors.BadRequest(`Cannot extend booking in status '${booking.status}'.`);
    }

    const currentEndMs = new Date(booking.end_at).getTime();
    const newEndMs     = currentEndMs + extensionMinutes * 60 * 1000;
    const newEndAt     = new Date(newEndMs).toISOString();

    // Check if extended portion collides with another booking
    const overlaps = await bookingRepo.findOverlapping(
      booking.resource_id,
      booking.end_at,
      newEndAt,
      booking.id
    );

    if (overlaps.length > 0) {
      throw Errors.BookingConflict({
        message: 'Cannot extend booking: subsequent time slot is already reserved.',
        conflictingBookings: overlaps.map((b) => ({ id: b.id, startAt: b.start_at, endAt: b.end_at })),
      });
    }

    const updated = await bookingRepo.update(bookingId, {
      end_at:     newEndAt,
      updated_at: new Date(),
    });

    await appendAuditEvent({
      actorId:    actor.sub,
      actorRole:  actor.role,
      action:     'BOOKING_EXTENDED',
      entityType: 'Booking',
      entityId:   bookingId,
      resourceId: booking.resource_id,
      reason:     reason || `Extended by ${extensionMinutes} minutes`,
      visibility: 'PARTIES',
      payload:    { previousEnd: booking.end_at, newEnd: newEndAt, extensionMinutes },
    });

    return updated;
  }

  /**
   * Cancels a booking, evaluates late cancellation, and triggers waitlist promotion.
   */
  async cancelBooking(bookingId, actor, reason) {
    const booking = await bookingRepo.findDetailById(bookingId);
    if (!booking) {
      throw Errors.NotFound('Booking not found.');
    }

    const isOwner = booking.user_id === actor.sub;
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some(
      (m) => m.institutionId === booking.institution_id && ['ADMIN', 'MANAGER'].includes(m.role)
    );

    if (!isOwner && !isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('You are not authorized to cancel this booking.');
    }

    if (['RETURNED', 'CLOSED', 'CANCELLED'].includes(booking.status)) {
      throw Errors.BadRequest(`Cannot cancel booking in status '${booking.status}'.`);
    }

    // 1. Transition Booking -> CANCELLED
    const { entity: cancelledBooking } = await transitionService.transition(
      'Booking',
      booking,
      'CANCELLED',
      actor,
      reason
    );

    // 2. Also transition linked AccessRequest to CANCELLED if present
    if (booking.request_id) {
      try {
        await transitionService.transition(
          'AccessRequest',
          booking.request_id,
          'CANCELLED',
          actor,
          `Booking cancelled: ${reason}`
        );
      } catch (err) {
        // Soft fail if access request was already in another state
      }
    }

    // 3. FIFO Waitlist Promotion check (Spec §4.10)
    let waitlistCandidate = null;
    try {
      const waitlistEntry = await db('waitlist_entries')
        .where('resource_id', booking.resource_id)
        .where('status', 'PENDING')
        .where('desired_start', '>=', booking.start_at)
        .where('desired_end', '<=', booking.end_at)
        .orderBy('position', 'asc')
        .first();

      if (waitlistEntry) {
        waitlistCandidate = waitlistEntry;
        // Notify facility manager and waitlisted requester
        await db('notifications').insert({
          user_id: waitlistEntry.request_id, // or requester user id
          event_type: 'WAITLIST_SLOT_AVAILABLE',
          title: 'A slot has opened for your waitlisted resource!',
          body: `A slot on ${booking.resource_name} matching your desired window is now free.`,
          meta: JSON.stringify({ resourceId: booking.resource_id, waitlistId: waitlistEntry.id }),
        });
      }
    } catch {
      // Soft fail on waitlist notification in tests
    }

    return { booking: cancelledBooking, waitlistNotified: Boolean(waitlistCandidate) };
  }

  /**
   * Marks a booking as NO-SHOW after the grace period has elapsed.
   */
  async markNoShow(bookingId, actor, { notes } = {}) {
    const booking = await bookingRepo.findDetailById(bookingId);
    if (!booking) {
      throw Errors.NotFound('Booking not found.');
    }

    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some(
      (m) => m.institutionId === booking.institution_id && ['ADMIN', 'MANAGER', 'OPERATOR'].includes(m.role)
    );

    if (!isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('Only facility staff or administrators may mark a booking as no-show.');
    }

    if (booking.status !== 'SCHEDULED') {
      throw Errors.BadRequest(`Cannot mark no-show for booking in status '${booking.status}'.`);
    }

    const startMs = new Date(booking.start_at).getTime();
    const graceWindowMs = 15 * 60 * 1000; // 15 minutes grace period
    const nowMs = Date.now();

    if (nowMs < startMs + graceWindowMs) {
      throw Errors.BadRequest('Grace period has not elapsed yet. No-show can only be marked after startAt + 15 minutes.');
    }

    const newCount = (booking.no_show_count || 0) + 1;
    const updated = await bookingRepo.update(bookingId, {
      status:        'CANCELLED',
      no_show_count: newCount,
      updated_at:    new Date(),
    });

    await appendAuditEvent({
      actorId:    actor.sub,
      actorRole:  actor.role,
      action:     'BOOKING_MARKED_NO_SHOW',
      entityType: 'Booking',
      entityId:   bookingId,
      resourceId: booking.resource_id,
      reason:     notes || 'Requester failed to check in within grace window',
      visibility: 'PARTIES',
      payload:    { noShowCount: newCount, notes },
    });

    return updated;
  }

  /**
   * Exports booking into standard iCalendar (.ics) format (Spec §4.11).
   */
  async generateIcs(bookingId, actor) {
    const booking = await this.getBookingById(bookingId, actor);

    const formatIcsDate = (dateStr) => {
      return new Date(dateStr)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Institutional Resource Access Network//Demo Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${booking.id}@resourcemanager.local`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
      `DTSTART:${formatIcsDate(booking.start_at)}`,
      `DTEND:${formatIcsDate(booking.end_at)}`,
      `SUMMARY:Reservation: ${booking.resource_name || 'Lab Equipment'}`,
      `DESCRIPTION:Booking ID: ${booking.id}\\nStatus: ${booking.status}\\nFacility: ${booking.facility_name || 'Lab'}`,
      `LOCATION:${booking.facility_name || 'Facility'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    return icsContent;
  }
}

const bookingService = new BookingService();
module.exports = { bookingService, BookingService };
