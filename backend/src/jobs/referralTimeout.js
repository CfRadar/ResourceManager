'use strict';

/**
 * src/jobs/referralTimeout.js
 *
 * Spec §5.3 & §4.14: Marks cross-institutional referrals as NO_RESPONSE
 * after REFERRAL.NO_RESPONSE_DAYS (default 7 days) without answer.
 */

const { db } = require('../config/db');
const { REFERRAL } = require('../config/constants');
const { transition } = require('../services/transition');
const notificationsService = require('../modules/notifications/notifications.service');

const SYSTEM_ACTOR = {
  sub:  '00000000-0000-0000-0000-000000000000',
  role: 'PLATFORM_ADMIN',
};

async function runReferralTimeout() {
  const timeoutDays = REFERRAL.NO_RESPONSE_DAYS || 7;
  const cutoff = new Date(Date.now() - timeoutDays * 24 * 3600 * 1000);

  const staleReferrals = await db('referrals')
    .where('status', 'REFERRAL_SENT')
    .andWhere('created_at', '<', cutoff);

  let timedOutCount = 0;

  for (const ref of staleReferrals) {
    try {
      await transition(
        'Referral',
        ref.id,
        'NO_RESPONSE',
        SYSTEM_ACTOR,
        `Referral timed out after ${timeoutDays} days without response from receiving institution`,
        { extraUpdates: { no_response_at: new Date() } }
      );

      // Notify originating coordinator
      if (ref.coordinator_id) {
        await notificationsService.createNotification({
          userId:    ref.coordinator_id,
          eventType: 'REFERRAL_TIMEOUT',
          title:     'Referral Marked as No Response',
          body:      `A cross-institutional referral received no response within ${timeoutDays} days and has been marked as NO_RESPONSE.`,
          actionLink: { label: 'Review Referral', url: `/referrals/${ref.id}` },
          meta:      { referralId: ref.id, needRequestId: ref.need_request_id },
        });
      }

      timedOutCount++;
    } catch (err) {
      console.error(`[referralTimeout] Failed to transition referral ${ref.id}:`, err.message);
    }
  }

  return { timedOutCount };
}

module.exports = { runReferralTimeout, SYSTEM_ACTOR };

