'use strict';

/**
 * src/middleware/validate.js
 *
 * Zod-based request validation middleware factory.
 * Produces the standard VALIDATION_ERROR envelope (HTTP 400) on failure.
 *
 * Usage:
 *   const { validate } = require('../middleware/validate');
 *   const { z } = require('zod');
 *
 *   router.post(
 *     '/bookings',
 *     validate({
 *       body:  z.object({ resourceId: z.string().uuid(), startAt: z.string().datetime() }),
 *       query: z.object({ dryRun: z.enum(['true','false']).optional() }),
 *     }),
 *     bookingController.create
 *   );
 *
 * Validated, coerced data is written back to req.body / req.query / req.params
 * so downstream handlers always receive the typed, stripped values.
 * Unknown fields are stripped (Zod .strip() default) — not passed through.
 */

const { Errors } = require('../utils/AppError');

/**
 * @typedef {Object} ValidateSchemas
 * @property {import('zod').ZodTypeAny} [body]   - Schema for req.body
 * @property {import('zod').ZodTypeAny} [query]  - Schema for req.query
 * @property {import('zod').ZodTypeAny} [params] - Schema for req.params
 */

/**
 * Returns an Express middleware that validates req.{body,query,params}
 * against the provided Zod schemas.
 *
 * @param {ValidateSchemas} schemas
 * @returns {import('express').RequestHandler}
 */
function validate(schemas = {}) {
  return (req, _res, next) => {
    const errors = [];

    for (const [location, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      const result = schema.safeParse(req[location]);

      if (!result.success) {
        // Collect all field issues from this location, prefixed with location name.
        for (const issue of result.error.issues) {
          errors.push({
            path:     [location, ...issue.path].join('.') || location,
            message:  issue.message,
          });
        }
      } else {
        // Write back coerced/stripped data so controllers get typed values.
        req[location] = result.data;
      }
    }

    if (errors.length > 0) {
      return next(
        Errors.Validation('Request validation failed.', { fields: errors })
      );
    }

    return next();
  };
}

module.exports = { validate };
