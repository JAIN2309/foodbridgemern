// Centralized 500-error responder.
//
// Why this exists: returning `error.message` straight to the client leaks
// internal details (DB errors, stack info, validation internals). This logs the
// real error server-side + to Sentry, and returns a safe generic message.
//
// Usage in a catch block:
//   } catch (error) {
//     return serverError(res, error, 'createDonation');
//   }

let Sentry = null;
try {
  Sentry = require('@sentry/node');
} catch { /* @sentry/node not installed — logging still works via console */ }

/**
 * Log an internal error and send a generic 500 to the client.
 * @param {import('express').Response} res
 * @param {Error} error      the caught error (logged, never sent to client)
 * @param {string} [context] short label for logs/Sentry (e.g. the handler name)
 * @returns the Express response
 */
function serverError(res, error, context = '') {
  const tag = context ? `[500] ${context}` : '[500]';
  console.error(`💥 ${tag}:`, error?.message || error);
  if (error?.stack) console.error(error.stack);

  if (Sentry?.captureException) {
    Sentry.captureException(error, context ? { tags: { handler: context } } : undefined);
  }

  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
}

module.exports = serverError;
