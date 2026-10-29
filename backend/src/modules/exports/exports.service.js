'use strict';

/**
 * src/modules/exports/exports.service.js
 *
 * Generation of Excel spreadsheets (.xlsx), PDF dossiers, and CSV audit trails.
 * Spec §4.22, Step 09.
 */

const ExcelJS              = require('exceljs');
const PDFDocument          = require('pdfkit');
const { db }               = require('../../config/db');
const { incidentRepo }     = require('../incidents/incidents.repository');
const { appendAuditEvent } = require('../../services/auditChain');
const { Errors }           = require('../../utils/AppError');

class ExportsService {
  /**
   * Generates facility bookings spreadsheet (.xlsx).
   */
  async generateBookingsExcel({ facilityId, from, to }, user) {
    let query = db('bookings as b')
      .leftJoin('resources as r', 'b.resource_id', 'r.id')
      .leftJoin('facilities as f', 'r.facility_id', 'f.id')
      .leftJoin('users as u', 'b.user_id', 'u.id')
      .select(
        'b.id',
        'r.name as resource_name',
        'u.name as requester_name',
        'f.name as facility_name',
        'b.start_time',
        'b.end_time',
        'b.status'
      );

    if (facilityId) query = query.where('r.facility_id', facilityId);
    if (from) query = query.where('b.start_time', '>=', from);
    if (to) query = query.where('b.end_time', '<=', to);

    const rows = await query.orderBy('b.start_time', 'desc').limit(500);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Resource Manager';
    const worksheet = workbook.addWorksheet('Bookings Report');

    worksheet.columns = [
      { header: 'Booking ID', key: 'id', width: 38 },
      { header: 'Resource Name', key: 'resource_name', width: 30 },
      { header: 'Requester', key: 'requester_name', width: 25 },
      { header: 'Facility', key: 'facility_name', width: 25 },
      { header: 'Start Time (UTC)', key: 'start_time', width: 24 },
      { header: 'End Time (UTC)', key: 'end_time', width: 24 },
      { header: 'Status', key: 'status', width: 16 },
    ];

    worksheet.getRow(1).font = { bold: true };

    rows.forEach((row) => {
      worksheet.addRow({
        id:             row.id,
        resource_name:  row.resource_name || 'N/A',
        requester_name: row.requester_name || 'N/A',
        facility_name:  row.facility_name || 'N/A',
        start_time:     row.start_time ? new Date(row.start_time).toISOString() : '',
        end_time:       row.end_time ? new Date(row.end_time).toISOString() : '',
        status:         row.status,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    await appendAuditEvent({
      actorId:    user.sub,
      actorRole:  user.role || 'USER',
      action:     'EXPORT_BOOKINGS_XLSX',
      entityType: 'Export',
      entityId:   facilityId || 'all',
      reason:     'Bookings report generated',
      visibility: 'INTERNAL',
    });

    return buffer;
  }

  /**
   * Generates institutional resource utilization report (.xlsx).
   */
  async generateUsageReportExcel({ institutionId }, user) {
    let query = db('resources as r')
      .join('facilities as f', 'r.facility_id', 'f.id')
      .join('institutions as inst', 'f.institution_id', 'inst.id')
      .leftJoin('bookings as b', 'r.id', 'b.resource_id')
      .select(
        'inst.name as institution_name',
        'f.name as facility_name',
        'r.name as resource_name',
        'r.category',
        db.raw('COUNT(b.id) as total_bookings'),
        db.raw("COUNT(CASE WHEN b.status = 'CLOSED' THEN 1 END) as completed_bookings")
      )
      .groupBy('inst.name', 'f.name', 'r.name', 'r.category');

    if (institutionId) query = query.where('inst.id', institutionId);

    const rows = await query.limit(200);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Utilization Summary');

    worksheet.columns = [
      { header: 'Institution', key: 'institution_name', width: 30 },
      { header: 'Facility', key: 'facility_name', width: 25 },
      { header: 'Resource', key: 'resource_name', width: 30 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Total Bookings', key: 'total_bookings', width: 16 },
      { header: 'Completed Bookings', key: 'completed_bookings', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    rows.forEach((r) => worksheet.addRow(r));

    const buffer = await workbook.xlsx.writeBuffer();

    await appendAuditEvent({
      actorId:    user.sub,
      actorRole:  user.role || 'ADMIN',
      action:     'EXPORT_USAGE_XLSX',
      entityType: 'Export',
      entityId:   institutionId || 'all',
      reason:     'Equipment utilization summary generated',
      visibility: 'INTERNAL',
    });

    return buffer;
  }

  /**
   * Generates tamper-evident SHA-256 audit log export in CSV format.
   */
  async generateAuditCsv({ scope, entityType, from, to }, user) {
    let query = db('audit_events')
      .select('seq', 'at', 'actor_id', 'actor_role', 'action', 'entity_type', 'entity_id', 'prev_hash', 'hash');

    if (entityType) query = query.where({ entity_type: entityType });
    if (from) query = query.where('at', '>=', from);
    if (to) query = query.where('at', '<=', to);

    const rows = await query.orderBy('seq', 'asc').limit(1000);

    const header = 'seq,at,actor_id,actor_role,action,entity_type,entity_id,prev_hash,hash\n';
    const lines = rows.map((r) =>
      `"${r.seq}","${new Date(r.at).toISOString()}","${r.actor_id || ''}","${r.actor_role || ''}","${r.action}","${r.entity_type}","${r.entity_id}","${r.prev_hash || ''}","${r.hash}"`
    );

    const csvContent = header + lines.join('\n');

    await appendAuditEvent({
      actorId:    user.sub,
      actorRole:  user.role || 'ADMIN',
      action:     'EXPORT_AUDIT_CSV',
      entityType: 'Export',
      entityId:   scope || 'global',
      reason:     'Audit log CSV exported',
      visibility: 'INTERNAL',
    });

    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Generates formal incident dossier in PDF format (.pdf).
   */
  async generateIncidentPdf(incidentId, user) {
    const incident = await incidentRepo.findDetailById(incidentId);
    if (!incident) {
      throw Errors.NotFound('Incident not found.');
    }

    const notes = await incidentRepo.findNotes(incidentId, { includeInternal: true });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        try {
          await appendAuditEvent({
            actorId:    user.sub,
            actorRole:  user.role || 'MANAGER',
            action:     'EXPORT_INCIDENT_PDF',
            entityType: 'Incident',
            entityId:   incidentId,
            reason:     'Incident dossier PDF exported',
            visibility: 'PARTIES',
          });
        } catch (e) {
          // Soft fail
        }
        resolve(pdfData);
      });
      doc.on('error', (err) => reject(err));

      // Header
      doc.fontSize(20).text('Institutional Resource Network', { align: 'center' });
      doc.fontSize(14).text('Formal Incident Dossier & Investigation Report', { align: 'center' });
      doc.moveDown();

      // Metadata Box
      doc.fontSize(10);
      doc.text(`Incident ID: ${incident.id}`);
      doc.text(`Reported Date: ${new Date(incident.created_at).toISOString()}`);
      doc.text(`Type: ${incident.type}`);
      doc.text(`Severity: ${incident.severity_by_reporter || 'MEDIUM'}`);
      doc.text(`Status: ${incident.status}`);
      doc.text(`Reporter: ${incident.reporter_name || 'N/A'} (${incident.reporter_email || 'N/A'})`);
      doc.text(`Reviewer: ${incident.reviewer_name || 'Pending assignment'}`);
      doc.moveDown();

      // Description & Findings
      doc.fontSize(12).text('Description:', { underline: true });
      doc.fontSize(10).text(incident.description);
      doc.moveDown();

      if (incident.findings) {
        doc.fontSize(12).text('Findings & Investigation Ruling:', { underline: true });
        doc.fontSize(10).text(incident.findings);
        doc.moveDown();
      }

      // Timeline / Notes
      doc.fontSize(12).text('Timeline & Evidence Statements:', { underline: true });
      if (notes.length === 0) {
        doc.fontSize(10).text('No recorded statement history.');
      } else {
        notes.forEach((n) => {
          doc.fontSize(9).text(
            `[${new Date(n.created_at).toISOString()}] ${n.author_name} (${n.visibility}): ${n.content}`
          );
        });
      }

      doc.moveDown();
      doc.fontSize(8).text('CONFIDENTIAL — Generated by Resource Manager System', { align: 'center' });
      doc.end();
    });
  }

  /**
   * Generates formal transaction receipt in PDF format (.pdf).
   */
  async generateTransactionPdf(requestId, user) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        try {
          await appendAuditEvent({
            actorId:    user.sub,
            actorRole:  user.role || 'USER',
            action:     'EXPORT_TRANSACTION_PDF',
            entityType: 'Transaction',
            entityId:   requestId,
            reason:     'Transaction receipt PDF generated',
            visibility: 'PARTIES',
          });
        } catch (e) {
          // Soft fail
        }
        resolve(pdfData);
      });
      doc.on('error', (err) => reject(err));

      doc.fontSize(18).text('Official Transaction Receipt', { align: 'center' });
      doc.fontSize(10).text('Institutional Resource Access Network', { align: 'center' });
      doc.moveDown();

      doc.fontSize(10);
      doc.text(`Transaction Reference: ${requestId}`);
      doc.text(`Generated At: ${new Date().toISOString()}`);
      doc.text(`Authorized Party: ${user.sub}`);
      doc.text('Settlement Status: SIMULATED DEMO SETTLEMENT');
      doc.moveDown();

      doc.fontSize(10).text(
        'This document confirms formal recording of resource reservation, policy agreement, and tamper-evident audit chaining.'
      );
      doc.moveDown();

      doc.fontSize(8).text('Demonstration prototype document. No monetary value.', { align: 'center' });
      doc.end();
    });
  }
}

const exportsService = new ExportsService();

module.exports = {
  ExportsService,
  exportsService,
};

