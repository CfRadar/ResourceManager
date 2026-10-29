'use strict';

/**
 * src/modules/bookings/bookings.controller.js
 *
 * HTTP handlers for Bookings endpoints.
 * Spec §4.11, Step 07.
 */

const { bookingService } = require('./bookings.service');

async function getMyBookings(req, res, next) {
  try {
    const { items, meta } = await bookingService.getMyBookings(req.user.sub, req.query);
    return res.json({
      ok: true,
      data: items,
      meta,
    });
  } catch (err) {
    next(err);
  }
}

async function getBookingById(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.params.id, req.user);
    return res.json({
      ok: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
}

async function getFacilityCalendar(req, res, next) {
  try {
    const { from, to, status } = req.query;
    const bookings = await bookingService.getFacilityCalendar(
      req.params.id,
      from,
      to,
      status,
      req.user
    );
    return res.json({
      ok: true,
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
}

async function rescheduleBooking(req, res, next) {
  try {
    const updated = await bookingService.rescheduleBooking(req.params.id, req.user, req.body);
    return res.json({
      ok: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

async function extendBooking(req, res, next) {
  try {
    const updated = await bookingService.extendBooking(req.params.id, req.user, req.body);
    return res.json({
      ok: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const result = await bookingService.cancelBooking(req.params.id, req.user, req.body.reason);
    return res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function markNoShow(req, res, next) {
  try {
    const updated = await bookingService.markNoShow(req.params.id, req.user, req.body);
    return res.json({
      ok: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

async function exportIcs(req, res, next) {
  try {
    const icsString = await bookingService.generateIcs(req.params.id, req.user);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${req.params.id}.ics"`);
    return res.send(icsString);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyBookings,
  getBookingById,
  getFacilityCalendar,
  rescheduleBooking,
  extendBooking,
  cancelBooking,
  markNoShow,
  exportIcs,
};
