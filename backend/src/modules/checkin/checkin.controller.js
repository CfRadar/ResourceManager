'use strict';

/**
 * src/modules/checkin/checkin.controller.js
 *
 * HTTP handlers for Check-In, Start-Use, Check-Out, and Return Confirmation.
 * Spec §4.12, Step 07.
 */

const { checkInService } = require('./checkin.service');

async function checkIn(req, res, next) {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const result = await checkInService.checkIn(req.params.id, req.user, req.body, clientIp);
    return res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function startUse(req, res, next) {
  try {
    const booking = await checkInService.startUse(req.params.id, req.user);
    return res.json({
      ok: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
}

async function checkOut(req, res, next) {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const result = await checkInService.checkOut(req.params.id, req.user, req.body, clientIp);
    return res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function confirmReturn(req, res, next) {
  try {
    const result = await checkInService.confirmReturn(req.params.id, req.user, req.body);
    return res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getConditionReports(req, res, next) {
  try {
    const reports = await checkInService.getConditionReports(req.params.id, req.user);
    return res.json({
      ok: true,
      data: reports,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkIn,
  startUse,
  checkOut,
  confirmReturn,
  getConditionReports,
};
