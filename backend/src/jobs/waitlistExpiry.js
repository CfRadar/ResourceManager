'use strict';

/**
 * src/jobs/waitlistExpiry.js
 *
 * Spec §5.3 & §4.10: Hourly check to expire unaccepted waitlist offers after 24h
 * and notify the next user in the FIFO queue.
 */

const { db } = require('../config/db');
const { WAITLIST } = require('../config/constants');
const { appendAuditEvent } = require('../services/auditChain');
const notificationsService = require('../modules/notifications/notifications.service');

async function runWaitlistExpiry() {
  const now = new Date();
  let expiredOffers = 0;
  let newOffers = 0;

  const expiredEntries = await db('waitlist_entries')
    .where('status', 'OFFERED')
    .andWhere('offer_expires_at', '<', now);

  for (const entry of expiredEntries) {
    // 1. Expire current offer
    await db('waitlist_entries')
      .where({ id: entry.id })
      .update({ status: 'EXPIRED' });

    await appendAuditEvent({
      action:     'WAITLIST_OFFER_EXPIRED',
      entityType: 'WaitlistEntry',
      entityId:   entry.id,
      resourceId: entry.resource_id,
      reason:     'Candidate did not claim offered slot within 24-hour window',
      visibility: 'PARTIES',
    });

    expiredOffers++;

    // 2. Find next FIFO candidate for this resource
    const nextCandidate = await db('waitlist_entries')
      .where({
        resource_id: entry.resource_id,
        status:      'PENDING',
      })
      .orderBy('position', 'asc')
      .orderBy('created_at', 'asc')
      .first();

    if (nextCandidate) {
      const offerExpiry = new Date(now.getTime() + (WAITLIST.OFFER_EXPIRES_HOURS || 24) * 3600 * 1000);

      await db('waitlist_entries')
        .where({ id: nextCandidate.id })
        .update({
          status:           'OFFERED',
          offer_expires_at: offerExpiry,
        });

      await appendAuditEvent({
        action:     'WAITLIST_SLOT_OFFERED',
        entityType: 'WaitlistEntry',
        entityId:   nextCandidate.id,
        resourceId: nextCandidate.resource_id,
        reason:     'Slot offered to next candidate in FIFO queue',
        visibility: 'PARTIES',
      });

      // Retrieve requester ID from access_request
      const request = await db('access_requests')
        .where({ id: nextCandidate.request_id })
        .first();

      if (request && request.user_id) {
        await notificationsService.createNotification({
          userId:    request.user_id,
          eventType: 'WAITLIST_SLOT_AVAILABLE',
          title:     'Waitlist Slot Available!',
          body:      'A reserved slot for your requested resource has opened up. You have 24 hours to claim it.',
          actionLink: { label: 'Claim Booking', url: `/access-requests/${request.id}` },
          meta:      { requestId: request.id, waitlistId: nextCandidate.id },
        });
      }

      newOffers++;
    }
  }

  return { expiredOffers, newOffers };
}

module.exports = { runWaitlistExpiry };

