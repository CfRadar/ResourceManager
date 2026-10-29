'use strict';

/**
 * src/modules/checkin/checkin.service.js
 *
 * Business logic for Check-In, Start-Use, Check-Out, Return Confirmation,
 * Virtual Signatures, Haversine Soft Geofencing, and Condition Diffing.
 * Spec §4.12, Step 07.
 */

const crypto                    = require('crypto');
const { checkInRepo }           = require('./checkin.repository');
const { bookingRepo }           = require('../bookings/bookings.repository');
const transitionService         = require('../../services/transition');
const { evaluateGeofence }      = require('../../utils/geo');
const { Errors, AppError }      = require('../../utils/AppError');
const { db }                    = require('../../config/db');

class CheckInService {
  /**
   * Helper to generate cryptographic virtual signature record (Spec §4.12).
   */
  static generateSignatureRecord(signatureData, contentToHash, userId, ip) {
    const timestamp = new Date().toISOString();
    const contentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(contentToHash))
      .digest('hex');

    return {
      type:        signatureData.type,
      text:        signatureData.text || null,
      pngDataUrl:  signatureData.pngDataUrl || null,
      userId,
      timestamp,
      ip:          ip || '127.0.0.1',
      contentHash,
      notice:      'Acknowledged electronically (demo). This is a prototype record of acknowledgment.',
      demo:        true,
    };
  }

  /**
   * Computes the automated diff between BEFORE and AFTER condition reports.
   */
  static computeConditionDiff(beforeReport, afterReport) {
    if (!beforeReport || !afterReport) {
      return null;
    }

    const beforeRating = Number(beforeReport.rating || 5);
    const afterRating  = Number(afterReport.rating || 5);
    const ratingDrop   = Math.max(0, beforeRating - afterRating);
    const ratingFlagged = ratingDrop >= 2;

    // Parse accessories
    const parseAccessories = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const beforeAcc = parseAccessories(beforeReport.accessories);
    const afterAcc  = parseAccessories(afterReport.accessories);

    // Identify missing accessories by name or id
    const afterSet = new Set(
      afterAcc.map((a) => (typeof a === 'string' ? a.toLowerCase() : (a.name || a.id || '').toLowerCase()))
    );

    const missingAccessories = beforeAcc.filter((a) => {
      const name = (typeof a === 'string' ? a : (a.name || a.id || '')).toLowerCase();
      return !afterSet.has(name);
    });

    return {
      beforeRating,
      afterRating,
      ratingDrop,
      ratingFlagged,
      missingAccessories,
      hasMissingAccessories: missingAccessories.length > 0,
      notesFlagged: Boolean(afterReport.notes && afterReport.notes.trim().length > 0),
      requiresInspection: ratingFlagged || missingAccessories.length > 0,
    };
  }

  /**
   * Submits check-in with BEFORE condition report, virtual signature, and soft GPS.
   */
  async checkIn(bookingId, actor, data, clientIp = '127.0.0.1') {
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
      throw Errors.Forbidden('You are not authorized to check into this booking.');
    }

    if (booking.status !== 'SCHEDULED') {
      throw Errors.BadRequest(`Cannot check in for booking currently in status '${booking.status}'.`);
    }

    // 1. Validate Check-in Window [startAt - 15min, startAt + graceMinutes]
    const nowMs        = Date.now();
    const startMs      = new Date(booking.start_at).getTime();
    const graceMinutes = booking.grace_period_minutes != null ? Number(booking.grace_period_minutes) : 15;
    const earlyLimit   = startMs - 15 * 60 * 1000; // 15 min early allowed
    const graceLimit   = startMs + graceMinutes * 60 * 1000; // grace period

    if (nowMs < earlyLimit) {
      throw Errors.BadRequest(
        `Check-in window opens 15 minutes prior to start (${new Date(earlyLimit).toISOString()}).`
      );
    }
    if (nowMs > graceLimit) {
      throw Errors.BadRequest(
        `Check-in window closed. Grace period of ${graceMinutes} minutes has expired.`
      );
    }

    // 2. Evaluate Soft Geofencing
    const facilityCoords = {
      lat: booking.facility_lat,
      lng: booking.facility_lng,
    };
    const geoStatus = evaluateGeofence(facilityCoords, data.geo, booking.geofence_radius_meters || 150);

    // 3. Virtual Signature Hash
    const signatureRecord = CheckInService.generateSignatureRecord(
      data.signature,
      { bookingId, report: data.conditionReport, accessories: data.accessories },
      actor.sub,
      clientIp
    );

    // 4. Save condition_reports (BEFORE)
    const reportData = {
      booking_id:   booking.id,
      kind:         'BEFORE',
      rating:       data.conditionReport.rating,
      notes:        data.conditionReport.notes || null,
      photo_ids:    data.conditionReport.photos || [],
      accessories:  JSON.stringify(data.accessories || []),
      signature:    JSON.stringify(signatureRecord),
      geo_status:   geoStatus,
      geo_lat:      data.geo?.lat || null,
      geo_lng:      data.geo?.lng || null,
      submitted_at: new Date(),
    };

    const savedReport = await checkInRepo.saveReport(reportData);

    // 5. Transition Booking -> CHECKED_IN
    const { entity: updatedBooking } = await transitionService.transition(
      'Booking',
      booking,
      'CHECKED_IN',
      actor,
      'Check-in completed with BEFORE condition report',
      {
        extraUpdates: {
          checked_in_at: new Date(),
        },
      }
    );

    return { booking: updatedBooking, conditionReport: savedReport };
  }

  /**
   * Advances booking from CHECKED_IN to IN_USE.
   */
  async startUse(bookingId, actor) {
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
      throw Errors.Forbidden('Not authorized to start use on this booking.');
    }

    if (booking.status !== 'CHECKED_IN') {
      throw Errors.BadRequest(`Cannot start use on booking in status '${booking.status}'.`);
    }

    const { entity } = await transitionService.transition(
      'Booking',
      booking,
      'IN_USE',
      actor,
      'Operator/Requester started equipment use'
    );

    return entity;
  }

  /**
   * Submits check-out with AFTER condition report and computes diff.
   */
  async checkOut(bookingId, actor, data, clientIp = '127.0.0.1') {
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
      throw Errors.Forbidden('You are not authorized to check out of this booking.');
    }

    if (!['CHECKED_IN', 'IN_USE'].includes(booking.status)) {
      throw Errors.BadRequest(`Cannot check out of booking currently in status '${booking.status}'.`);
    }

    // 1. Soft Geofencing
    const facilityCoords = {
      lat: booking.facility_lat,
      lng: booking.facility_lng,
    };
    const geoStatus = evaluateGeofence(facilityCoords, data.geo, booking.geofence_radius_meters || 150);

    // 2. Virtual Signature
    const signatureRecord = CheckInService.generateSignatureRecord(
      data.signature,
      { bookingId, report: data.conditionReport, accessoriesReturned: data.accessoriesReturned },
      actor.sub,
      clientIp
    );

    // 3. Save AFTER report
    const reportData = {
      booking_id:   booking.id,
      kind:         'AFTER',
      rating:       data.conditionReport.rating,
      notes:        data.conditionReport.notes || null,
      photo_ids:    data.conditionReport.photos || [],
      accessories:  JSON.stringify(data.accessoriesReturned || []),
      signature:    JSON.stringify(signatureRecord),
      geo_status:   geoStatus,
      geo_lat:      data.geo?.lat || null,
      geo_lng:      data.geo?.lng || null,
      submitted_at: new Date(),
    };

    const savedReport = await checkInRepo.saveReport(reportData);

    // 4. Transition Booking -> RETURNED
    const { entity: updatedBooking } = await transitionService.transition(
      'Booking',
      booking,
      'RETURNED',
      actor,
      'Check-out completed with AFTER condition report',
      {
        extraUpdates: {
          returned_at: new Date(),
        },
      }
    );

    // 5. Compute Condition Diff
    const beforeReport = await checkInRepo.findReportByKind(booking.id, 'BEFORE');
    const diff = CheckInService.computeConditionDiff(beforeReport, savedReport);

    return { booking: updatedBooking, conditionReport: savedReport, diff };
  }

  /**
   * Manager confirms clean return or flags incident.
   */
  async confirmReturn(bookingId, actor, { action, findings, notes }) {
    const booking = await bookingRepo.findDetailById(bookingId);
    if (!booking) {
      throw Errors.NotFound('Booking not found.');
    }

    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN';
    const isStaff = (actor.memberships || []).some(
      (m) => m.institutionId === booking.institution_id && ['ADMIN', 'MANAGER', 'OPERATOR'].includes(m.role)
    );

    if (!isPlatformAdmin && !isStaff) {
      throw Errors.Forbidden('Only facility staff or platform administrators may confirm returns.');
    }

    if (booking.status !== 'RETURNED') {
      throw Errors.BadRequest(`Cannot confirm return on booking in status '${booking.status}'.`);
    }

    if (action === 'CONFIRM') {
      const { entity } = await transitionService.transition(
        'Booking',
        booking,
        'CLOSED',
        actor,
        notes || 'Return confirmed clean by staff member'
      );
      return { booking: entity, incidentDraft: null };
    }

    if (action === 'FLAG_INCIDENT') {
      const beforeReport = await checkInRepo.findReportByKind(booking.id, 'BEFORE');
      const afterReport  = await checkInRepo.findReportByKind(booking.id, 'AFTER');
      const diff         = CheckInService.computeConditionDiff(beforeReport, afterReport);

      const incidentDraft = {
        bookingId:        booking.id,
        reporterId:       actor.sub,
        suggestedType:    diff?.hasMissingAccessories ? 'MISSING_ITEM' : 'DAMAGE',
        description:      findings || notes || 'Incident flagged during check-out inspection.',
        severity:         diff?.ratingDrop >= 2 ? 'HIGH' : 'MEDIUM',
        conditionDiff:    diff,
        demo:             true,
      };

      return { booking, incidentDraft };
    }

    throw Errors.BadRequest(`Unknown return confirmation action: ${action}`);
  }

  /**
   * Retrieves both BEFORE and AFTER reports alongside computed diff.
   */
  async getConditionReports(bookingId, actor) {
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
      throw Errors.Forbidden('Not authorized to view condition reports for this booking.');
    }

    const reports = await checkInRepo.findReportsByBookingId(bookingId);
    const before = reports.find((r) => r.kind === 'BEFORE') || null;
    const after  = reports.find((r) => r.kind === 'AFTER') || null;
    const diff   = CheckInService.computeConditionDiff(before, after);

    return { before, after, diff };
  }
}

const checkInService = new CheckInService();
module.exports = { checkInService, CheckInService };
