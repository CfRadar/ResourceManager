'use strict';

/**
 * src/modules/checkin/checkin.schema.js
 *
 * Zod validation schemas for Check-In, Check-Out, Signatures, and Return Confirmation.
 * Spec §4.12, Step 07.
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

const signatureSchema = z.object({
  type:       z.enum(['TYPED', 'DRAWN']),
  text:       z.string().min(1).max(255).optional(),
  pngDataUrl: z.string().min(10).optional(),
}).refine(
  (data) => (data.type === 'TYPED' ? Boolean(data.text) : Boolean(data.pngDataUrl)),
  { message: 'TYPED signature requires text; DRAWN signature requires pngDataUrl' }
);

const geoCoordsSchema = z.object({
  lat:      z.coerce.number().min(-90).max(90),
  lng:      z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).optional(),
});

const conditionReportInputSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  notes:  z.string().max(2000).optional().default(''),
  photos: z.array(z.string()).optional().default([]),
});

const checkInSchema = z.object({
  equipmentUnitId: z.string().max(128).optional(),
  accessories:     z.array(z.any()).optional().default([]),
  consumables:     z.array(z.any()).optional().default([]),
  conditionReport: conditionReportInputSchema,
  signature:       signatureSchema,
  geo:             geoCoordsSchema.optional().nullable(),
});

const checkOutSchema = z.object({
  conditionReport:     conditionReportInputSchema,
  accessoriesReturned: z.array(z.any()).optional().default([]),
  consumablesUsed:     z.array(z.any()).optional().default([]),
  signature:           signatureSchema,
  geo:                 geoCoordsSchema.optional().nullable(),
});

const confirmReturnSchema = z.object({
  action:   z.enum(['CONFIRM', 'FLAG_INCIDENT']),
  findings: z.string().max(2000).optional(),
  notes:    z.string().max(2000).optional(),
});

module.exports = {
  uuidSchema,
  signatureSchema,
  geoCoordsSchema,
  checkInSchema,
  checkOutSchema,
  confirmReturnSchema,
};
