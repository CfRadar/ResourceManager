'use strict';

/**
 * src/modules/accessRequests/accessRequests.controller.js
 *
 * HTTP handlers for Access Requests endpoints.
 * Spec §4.9, §4.10, Step 06.
 */

const { accessRequestService } = require('./accessRequests.service');

async function createRequest(req, res, next) {
  try {
    const result = await accessRequestService.createRequest(req.user.sub, req.body);
    return res.status(201).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getMyRequests(req, res, next) {
  try {
    const { items, meta } = await accessRequestService.getMyRequests(req.user.sub, req.query);
    return res.json({
      ok: true,
      data: items,
      meta,
    });
  } catch (err) {
    next(err);
  }
}

async function getRequestById(req, res, next) {
  try {
    const request = await accessRequestService.getRequestById(req.params.id, req.user);
    return res.json({
      ok: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
}

async function updateDraft(req, res, next) {
  try {
    const updated = await accessRequestService.updateDraft(req.params.id, req.user.sub, req.body);
    return res.json({
      ok: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

async function submitDraft(req, res, next) {
  try {
    const result = await accessRequestService.submitDraft(req.params.id, req.user.sub);
    return res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function cancelRequest(req, res, next) {
  try {
    const cancelled = await accessRequestService.cancelRequest(
      req.params.id,
      req.user,
      req.body.reason
    );
    return res.json({
      ok: true,
      data: cancelled,
    });
  } catch (err) {
    next(err);
  }
}

async function getReviewQueue(req, res, next) {
  try {
    const facilityId = req.params.facilityId || req.query.facilityId;
    const { items, meta } = await accessRequestService.getReviewQueue(req.user, {
      ...req.query,
      facilityId,
    });
    return res.json({
      ok: true,
      data: items,
      meta,
    });
  } catch (err) {
    next(err);
  }
}

async function startReview(req, res, next) {
  try {
    const request = await accessRequestService.startReview(req.params.id, req.user);
    return res.json({
      ok: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
}

async function requestInfo(req, res, next) {
  try {
    const request = await accessRequestService.requestInfo(req.params.id, req.user, req.body);
    return res.json({
      ok: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
}

async function respondInfo(req, res, next) {
  try {
    const request = await accessRequestService.respondInfo(
      req.params.id,
      req.user.sub,
      req.body
    );
    return res.json({
      ok: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
}

async function makeDecision(req, res, next) {
  try {
    const result = await accessRequestService.makeDecision(
      req.params.id,
      req.user,
      req.body
    );
    return res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function appealDecision(req, res, next) {
  try {
    const request = await accessRequestService.appealDecision(
      req.params.id,
      req.user.sub,
      req.body
    );
    return res.json({
      ok: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  updateDraft,
  submitDraft,
  cancelRequest,
  getReviewQueue,
  startReview,
  requestInfo,
  respondInfo,
  makeDecision,
  appealDecision,
};
