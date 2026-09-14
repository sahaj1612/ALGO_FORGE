const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { hashPassword, verifyPassword, generateToken } = require('../../services/authService');
const config = require('../../config/env');

describe('Unit: Authentication Helpers', () => {
  test('hashes password using scrypt with unique salt', async () => {
    const password = 'SuperSecretPassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    assert.ok(hash1.includes(':'), 'Hash format should be salt:digest');
    assert.notEqual(hash1, hash2, 'Salts should ensure hashes differ for the same password');
  });

  test('verifies correct password against hash', async () => {
    const password = 'SecureUserPassword2026';
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword(password, hash);
    assert.equal(isMatch, true, 'Valid password should verify successfully');
  });

  test('rejects incorrect password against hash', async () => {
    const password = 'CorrectPassword123';
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword('WrongPassword123', hash);
    assert.equal(isMatch, false, 'Invalid password should be rejected');
  });

  test('rejects invalid or malformed hash safely', async () => {
    const isMatch = await verifyPassword('password', 'malformed_hash_without_salt');
    assert.equal(isMatch, false, 'Malformed hash should fail safely');
  });

  test('generates valid JWT with subject ID and expiration', () => {
    const userId = '64f1234567890abcdef12345';
    const token = generateToken(userId);

    assert.ok(token, 'Token must be generated');
    const decoded = jwt.verify(token, config.jwtSecret);
    assert.equal(decoded.id, userId, 'Decoded token ID matches user ID');
    assert.ok(decoded.exp > Math.floor(Date.now() / 1000), 'Token expiration in future');
  });

  test('verifies expired or malformed token rejection', () => {
    assert.throws(() => {
      jwt.verify('invalid.token.string', config.jwtSecret);
    }, { name: 'JsonWebTokenError' });

    // Expired token test
    const expiredToken = jwt.sign({ id: '123' }, config.jwtSecret, { expiresIn: '-1s' });
    assert.throws(() => {
      jwt.verify(expiredToken, config.jwtSecret);
    }, { name: 'TokenExpiredError' });
  });
});
