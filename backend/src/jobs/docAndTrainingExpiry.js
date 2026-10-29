'use strict';

/**
 * src/jobs/docAndTrainingExpiry.js
 *
 * Spec §5.3 & §4.15: Daily job transitioning expired document agreements
 * and verified training records to EXPIRED.
 */

const { db } = require('../config/db');
const { appendAuditEvent } = require('../services/auditChain');
const notificationsService = require('../modules/notifications/notifications.service');

async function runDocAndTrainingExpiry() {
  const now = new Date();
  let expiredDocs = 0;
  let expiredTrainings = 0;

  // 1. User Documents
  const expiredUserDocs = await db('user_documents')
    .where('status', 'APPROVED')
    .andWhere('expires_at', '<', now);

  for (const doc of expiredUserDocs) {
    await db('user_documents')
      .where({ id: doc.id })
      .update({
        status:     'EXPIRED',
        updated_at: now,
      });

    await appendAuditEvent({
      action:     'DOCUMENT_EXPIRED',
      entityType: 'UserDocument',
      entityId:   doc.id,
      reason:     'Document validity period reached expiration date',
      visibility: 'PARTIES',
      payload:    { before: { status: 'APPROVED' }, after: { status: 'EXPIRED' } },
    });

    await notificationsService.createNotification({
      userId:    doc.user_id,
      eventType: 'DOCUMENT_EXPIRED',
      title:     'Compliance Document Expired',
      body:      'A required compliance document has expired and must be renewed for continued resource access.',
      actionLink: { label: 'Submit Document', url: `/documents` },
      meta:      { documentId: doc.id, templateId: doc.template_id },
    });

    expiredDocs++;
  }

  // 2. User Trainings
  const expiredUserTrainings = await db('user_trainings')
    .where('status', 'VERIFIED')
    .andWhere('expires_at', '<', now);

  for (const trn of expiredUserTrainings) {
    await db('user_trainings')
      .where({ id: trn.id })
      .update({
        status:     'EXPIRED',
        updated_at: now,
      });

    await appendAuditEvent({
      action:     'TRAINING_EXPIRED',
      entityType: 'UserTraining',
      entityId:   trn.id,
      reason:     'Training certificate reached expiration date',
      visibility: 'PARTIES',
      payload:    { before: { status: 'VERIFIED' }, after: { status: 'EXPIRED' } },
    });

    await notificationsService.createNotification({
      userId:    trn.user_id,
      eventType: 'TRAINING_EXPIRED',
      title:     'Training Certification Expired',
      body:      'Your verified training qualification has expired. Please complete refresher training.',
      actionLink: { label: 'View Trainings', url: `/trainings` },
      meta:      { trainingId: trn.training_id },
    });

    expiredTrainings++;
  }

  return { expiredDocs, expiredTrainings };
}

module.exports = { runDocAndTrainingExpiry };

