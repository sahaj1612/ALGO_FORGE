/**
 * Security Sanitization Utilities
 * Protects against diagnostic leakage, ANSI injection, host path exposure, and data spills.
 */

// Matches ANSI escape codes used for terminal coloring/cursor control
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

// Matches Windows and UNIX file system paths that might reveal server architecture
const HOST_PATH_REGEX = /(?:[a-zA-Z]:\\[^:\n\r\t]+|\/(?:workspace|tmp|app|home|var|usr|etc)\/[^\s:\n\r]+)/g;

/**
 * Remove ANSI escape sequences from terminal/compiler output
 */
function stripAnsi(text) {
  if (typeof text !== 'string') return '';
  return text.replace(ANSI_REGEX, '');
}

/**
 * Sanitize error message and diagnostics:
 * 1. Strip ANSI codes
 * 2. Redact host/sandbox filesystem paths to generic solution filenames
 * 3. Truncate to maximum output length to prevent memory/DOM bloat
 */
function sanitizeDiagnostic(errorText, maxLength = 32768) {
  if (!errorText) return null;
  let text = stripAnsi(String(errorText));

  // Normalize workspace and tmp references to friendly generic names
  text = text.replace(/\/workspace\/([a-zA-Z0-9_.-]+)/g, '$1');
  text = text.replace(/\/tmp\/([a-zA-Z0-9_.-]+)/g, '$1');
  text = text.replace(/[a-zA-Z]:\\[^:\n\r\t\\]+\\([a-zA-Z0-9_.-]+)/g, '$1');

  // Redact any remaining absolute host paths
  text = text.replace(HOST_PATH_REGEX, '[sandbox_path]');

  // Enforce max byte / character length
  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + '\n... [output truncated for security & length]';
  }

  return text.trim();
}

/**
 * Sanitize testcase results before returning to user or storing.
 * Crucial security invariant: Hidden testcases must NEVER leak input, expected, or raw payloads.
 */
function sanitizeTestResults(results = [], isPublic = false) {
  return results.map((r, idx) => {
    const sanitized = {
      ordinal: r.ordinal || idx + 1,
      status: r.status,
      time: r.time || 0,
      memory: r.memory || null,
      error: r.error ? sanitizeDiagnostic(r.error) : null
    };

    if (isPublic) {
      sanitized.input = r.input !== undefined ? String(r.input) : undefined;
      sanitized.expected = r.expected !== undefined ? String(r.expected) : undefined;
      sanitized.got = r.got !== undefined ? String(r.got) : undefined;
    }

    return sanitized;
  });
}

/**
 * Validate binary image header (Magic Numbers)
 * Rejects SVG, HTML, scripts, and spoofed extensions.
 * Returns verified mime type or null.
 */
function verifyImageMagicBytes(base64Data) {
  if (typeof base64Data !== 'string') return null;

  // Extract base64 payload if prefixed with data URI
  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/i);
  const rawBase64 = matches ? matches[2] : base64Data;

  // Enforce base64 character set
  if (!/^[a-zA-Z0-9+/=]+$/.test(rawBase64.trim())) {
    return null;
  }

  try {
    const buffer = Buffer.from(rawBase64, 'base64');
    if (buffer.length < 12) return null;

    // Check size limit: max 2MB (2,097,152 bytes)
    if (buffer.length > 2 * 1024 * 1024) {
      return null;
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
    ) {
      return 'image/png';
    }

    // GIF: GIF87a or GIF89a (47 49 46 38)
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'image/gif';
    }

    // WebP: RIFF ... WEBP (52 49 46 46 .... 57 45 42 50)
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    return null;
  } catch {
    return null;
  }
}

module.exports = {
  stripAnsi,
  sanitizeDiagnostic,
  sanitizeTestResults,
  verifyImageMagicBytes
};
