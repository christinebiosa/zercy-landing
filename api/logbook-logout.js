/**
 * Zercy Logbook — Logout
 * GET /api/logbook-logout
 * Clears the HttpOnly session cookie server-side and redirects to login.
 */

const { clearSessionCookie } = require('./_logbook-auth');

module.exports = function handler(req, res) {
  clearSessionCookie(res);
  res.setHeader('Location', '/logbook/login');
  return res.status(302).end();
};
