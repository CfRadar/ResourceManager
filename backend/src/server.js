'use strict';

/**
 * src/server.js
 *
 * HTTP server lifecycle: start, listen, and graceful shutdown.
 *
 * Separation of concerns:
 *   - src/app.js  → builds the Express app (importable without binding a port)
 *   - src/server.js → binds the app to a port and handles process signals
 *   - index.js    → loads env, then calls startServer()
 *
 * Graceful shutdown (SIGTERM / SIGINT):
 *   1. Stop accepting new connections.
 *   2. Wait up to GRACEFUL_SHUTDOWN ms for in-flight requests to finish.
 *   3. Destroy the Knex connection pool.
 *   4. Exit 0.
 * If the timeout expires, exit 1 to prevent hanging in orchestrators.
 */

const http = require('http');
const { createApp }   = require('./app');
const env             = require('./config/env');
const { TIMEOUT }     = require('./config/constants');
const { destroyDb }   = require('./config/db');

let server = null;

/**
 * Start the HTTP server.
 * @returns {http.Server}
 */
function startServer() {
  const app = createApp();
  server = http.createServer(app);

  server.listen(env.PORT, () => {
    console.log(
      `[server] Express backend running → http://localhost:${env.PORT} ` +
      `(${env.NODE_ENV})`
    );
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[server] ❌ Port ${env.PORT} is already in use. ` +
        `Run 'make clear' to free it.`
      );
    } else {
      console.error('[server] ❌ Server error:', err.message);
    }
    process.exit(1);
  });

  // Register shutdown handlers once.
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT',  () => shutdown('SIGINT'));

  return server;
}

/**
 * Graceful shutdown handler.
 * @param {string} signal
 */
async function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully…`);

  const timer = setTimeout(() => {
    console.error(
      `[server] ❌ Could not close connections within ${TIMEOUT.GRACEFUL_SHUTDOWN} ms. Forcing exit.`
    );
    process.exit(1);
  }, TIMEOUT.GRACEFUL_SHUTDOWN);

  // Prevent timer from keeping the process alive if everything closes cleanly.
  timer.unref();

  try {
    // 1. Stop accepting new connections; drain existing ones.
    if (server) {
      await new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
      console.log('[server] HTTP server closed.');
    }

    // 2. Destroy database pool.
    await destroyDb();

    clearTimeout(timer);
    console.log('[server] Shutdown complete. Bye.');
    process.exit(0);
  } catch (err) {
    clearTimeout(timer);
    console.error('[server] Error during shutdown:', err.message);
    process.exit(1);
  }
}

module.exports = { startServer, shutdown };
