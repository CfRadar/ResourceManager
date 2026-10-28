/**
 * index.js – Minimal entrypoint wrapper.
 *
 * Responsibility: load env first, then start the HTTP server.
 * All application logic lives in src/; this file stays deliberately thin
 * so that src/app.js can be imported in tests without binding a port.
 */

// Load and validate environment variables before anything else.
// This will throw (with a clear message) if required vars are missing.
require('./src/config/env');

const { startServer } = require('./src/server');

startServer();
