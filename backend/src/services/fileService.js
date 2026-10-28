'use strict';

/**
 * src/services/fileService.js
 *
 * File upload, storage, and secure retrieval service.
 *
 * Spec §4.12, §4.15, §5.2:
 *   - Accept jpg/png/webp (photos, max 5 MB) and pdf/jpg/png (documents, max 10 MB).
 *   - MIME sniffing (not just extension check).
 *   - Random filenames stored outside web root.
 *   - Files served only through authorised signed URLs or access-checked endpoints.
 *   - Optional image re-encode to strip EXIF/GPS data.
 *   - Adapter-based: local disk in development; S3-compatible in production.
 *
 * Implemented in: Step 07 (Bookings, Concurrency & Check-in) and Step 09.
 *
 * Interface (to be implemented):
 *
 *   saveFile(buffer, mimeType, options)
 *     → { fileId, path, size, mimeType }
 *
 *   getSignedUrl(fileId, actor)
 *     → { url, expiresAt }
 *
 *   deleteFile(fileId, options)  – soft delete only; never hard-delete
 *     → void
 */

// Placeholder — full implementation in Step 07 / 09.
async function saveFile()      { throw new Error('[fileService] Not yet implemented. Steps 07/09.'); }
async function getSignedUrl()  { throw new Error('[fileService] Not yet implemented. Steps 07/09.'); }
async function deleteFile()    { throw new Error('[fileService] Not yet implemented. Steps 07/09.'); }

module.exports = { saveFile, getSignedUrl, deleteFile };
