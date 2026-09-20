/**
 * Security Headers Middleware
 * Injects defense-in-depth HTTP security headers (HSTS, nosniff, frame denial, CSP, referrer policy).
 */

function securityHeaders(req, res, next) {
  // Remove identifiable server header
  res.removeHeader('X-Powered-By');

  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent framing to mitigate clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Modern XSS auditor disabling in favor of CSP
  res.setHeader('X-XSS-Protection', '0');

  // Strict referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HTTP Strict Transport Security (enforces TLS for 1 year)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' http://localhost:* ws:; object-src 'none'; frame-ancestors 'none';"
  );

  next();
}

module.exports = securityHeaders;
