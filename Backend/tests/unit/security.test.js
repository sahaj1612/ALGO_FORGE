const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  stripAnsi,
  sanitizeDiagnostic,
  sanitizeTestResults,
  verifyImageMagicBytes
} = require('../../utils/sanitizer');
const { getRunnerArgs } = require('../../services/judge');
const {
  issueRefreshToken,
  rotateRefreshToken
} = require('../../services/authService');
const User = require('../../models/User');
const RefreshToken = require('../../models/RefreshToken');
const config = require('../../config/env');

describe('Unit: Phase 4 Security & Trust Boundary Tests', () => {
  let testUser = null;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }
    testUser = await User.create({
      name: 'Security Test User',
      email: `security_unit_${Date.now()}@algoforge.test`,
      passwordHash: 'dummy:hash'
    });
  });

  after(async () => {
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
      await RefreshToken.deleteMany({ userId: testUser._id });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('Diagnostic & Path Sanitization', () => {
    test('strips ANSI color and control codes', () => {
      const raw = '\u001b[31mError:\u001b[0m \u001b[1mSyntaxError\u001b[0m on line 5';
      const clean = stripAnsi(raw);
      assert.equal(clean, 'Error: SyntaxError on line 5');
    });

    test('redacts host and workspace filesystem paths', () => {
      const compilerError = 'In file /workspace/solution.cpp:10: error: undefined reference in /tmp/build/123';
      const sanitized = sanitizeDiagnostic(compilerError);
      assert.ok(!sanitized.includes('/workspace/solution.cpp'));
      assert.ok(sanitized.includes('solution.cpp:10'));
    });

    test('never exposes hidden testcase inputs or expected outputs', () => {
      const rawResults = [
        { ordinal: 1, status: 'passed', input: 'secret_test_input', expected: 'secret_expected_output' },
        { ordinal: 2, status: 'wrong_answer', input: 'secret_case_2', expected: 'output_2' }
      ];

      // Hidden testcase sanitization (isPublic = false)
      const sanitizedHidden = sanitizeTestResults(rawResults, false);
      for (const r of sanitizedHidden) {
        assert.equal(r.input, undefined, 'Hidden test input must be undefined');
        assert.equal(r.expected, undefined, 'Hidden test expected output must be undefined');
        assert.ok(r.status);
      }

      // Public testcase sanitization (isPublic = true)
      const sanitizedPublic = sanitizeTestResults(rawResults, true);
      assert.equal(sanitizedPublic[0].input, 'secret_test_input');
      assert.equal(sanitizedPublic[0].expected, 'secret_expected_output');
    });
  });

  describe('Profile Image Magic Byte Verification', () => {
    test('detects valid PNG image magic bytes', () => {
      // 89 50 4E 47 0D 0A 1A 0A
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
      const base64Png = `data:image/png;base64,${pngHeader.toString('base64')}`;
      assert.equal(verifyImageMagicBytes(base64Png), 'image/png');
    });

    test('detects valid JPEG image magic bytes', () => {
      // FF D8 FF
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const base64Jpeg = `data:image/jpeg;base64,${jpegHeader.toString('base64')}`;
      assert.equal(verifyImageMagicBytes(base64Jpeg), 'image/jpeg');
    });

    test('rejects malicious SVG or HTML script payload disguised as image', () => {
      const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>fetch("/steal")</script></svg>';
      const base64Svg = `data:image/svg+xml;base64,${Buffer.from(maliciousSvg).toString('base64')}`;
      assert.equal(verifyImageMagicBytes(base64Svg), null, 'SVG payloads must be rejected');
    });

    test('rejects plain text and binary executables', () => {
      const elfHeader = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
      const base64Elf = `data:image/png;base64,${elfHeader.toString('base64')}`;
      assert.equal(verifyImageMagicBytes(base64Elf), null, 'ELF binaries must be rejected');
    });
  });

  describe('Hardened Runner Flags', () => {
    test('enforces rootless non-root UID, read-only root, tmpfs size cap, and no-new-privileges', () => {
      const args = getRunnerArgs({
        mount: '/tmp/test:/workspace:ro',
        memoryLimit: 256,
        image: 'algoforge-sandbox:latest',
        compileAndRun: ['python3', 'solution.py']
      });

      assert.ok(args.includes('--read-only'), 'Container rootfs must be read-only');
      assert.ok(args.includes('--cap-drop=ALL'), 'Capabilities must be dropped');
      assert.ok(args.includes('no-new-privileges:true'), 'no-new-privileges must be enforced');
      assert.ok(args.includes('1000:1000'), 'Must run as non-root UID 1000');
      assert.ok(args.includes('/tmp:rw,nosuid,size=64m'), 'tmpfs must enforce 64MB size cap and nosuid');
      assert.ok(args.includes('none'), 'Network must be set to none (air-gapped)');
    });
  });

  describe('Refresh Token Rotation & Reuse Detection', () => {
    test('issues valid refresh token and successfully rotates with replacement tracking', async () => {
      const rawToken = await issueRefreshToken(testUser._id);
      assert.ok(rawToken, 'Refresh token must be returned');

      const rotated = await rotateRefreshToken(rawToken);
      assert.ok(rotated.accessToken, 'Rotated pair must contain new access token');
      assert.ok(rotated.refreshToken, 'Rotated pair must contain new refresh token');
      assert.notEqual(rotated.refreshToken, rawToken, 'New refresh token must be distinct');

      // Verify the old token was marked revoked
      const oldDoc = await RefreshToken.findOne({ tokenHash: require('crypto').createHash('sha256').update(rawToken).digest('hex') });
      assert.ok(oldDoc.revokedAt, 'Old refresh token must be revoked');
      assert.ok(oldDoc.replacedByTokenHash, 'Lineage must record replacedByTokenHash');
    });

    test('reuse detection revokes all sessions if a revoked token is replayed', async () => {
      const rawToken = await issueRefreshToken(testUser._id);
      const rotated = await rotateRefreshToken(rawToken);

      // Attacker attempts to replay the already-revoked `rawToken`
      await assert.rejects(
        async () => {
          await rotateRefreshToken(rawToken);
        },
        { name: 'UnauthorizedError', message: /Token reuse detected/ }
      );

      // The active `rotated.refreshToken` should now be invalidated as well
      const activeDoc = await RefreshToken.findOne({ tokenHash: require('crypto').createHash('sha256').update(rotated.refreshToken).digest('hex') });
      assert.ok(activeDoc.revokedAt, 'Replay detection must invalidate remaining active tokens');
    });
  });
});
