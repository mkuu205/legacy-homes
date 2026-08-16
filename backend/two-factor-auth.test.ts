import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

process.env.TOTP_ENCRYPTION_KEY = 'test-only-key-that-is-replaced-in-production';

const utilityPath = path.join(process.cwd(), 'src/utils/totp.ts');
const servicePath = path.join(process.cwd(), 'src/services/auth.service.ts');
const routesPath = path.join(process.cwd(), 'src/routes/auth.routes.ts');
const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
const migrationPath = path.join(process.cwd(), 'prisma/migrations/20260816000100_admin_totp_2fa/migration.sql');

test('TOTP secrets are encrypted and round-trip without plaintext persistence', async () => {
  const { generateTotpSecret, encryptTotpSecret, decryptTotpSecret } = await import('./src/utils/totp');
  const secret = generateTotpSecret();
  const encrypted = encryptTotpSecret(secret);
  assert.notEqual(encrypted, secret);
  assert.equal(decryptTotpSecret(encrypted), secret);
  assert.equal(encrypted.includes(secret), false);
});

test('recovery codes are hashed and consumed exactly once', async () => {
  const { generateRecoveryCodes, hashRecoveryCode, consumeRecoveryCode } = await import('./src/utils/totp');
  const [code] = generateRecoveryCodes(1);
  const hashes = [hashRecoveryCode(code)];
  const remaining = consumeRecoveryCode(hashes, code);
  assert.deepEqual(remaining, []);
  assert.equal(consumeRecoveryCode(remaining!, code), null);
  assert.notEqual(hashes[0], code);
});

test('2FA is integrated into the existing JWT/refresh authentication path', () => {
  const service = fs.readFileSync(servicePath, 'utf8');
  assert.match(service, /twoFactorRequired/);
  assert.match(service, /generateTokens\(user\)/);
  assert.match(service, /twoFactorChallenge/);
  assert.match(service, /refreshTokens/);
  assert.match(service, /user\.role !== 'RESIDENT'/);
});

test('2FA management routes are admin-authorized and challenge verification is rate limited', () => {
  const routes = fs.readFileSync(routesPath, 'utf8');
  assert.match(routes, /2fa\/verify-login.*authLimiter/);
  assert.match(routes, /authorize\(\.\.\.adminRoles\)/);
  assert.doesNotMatch(routes, /authorize\('ADMIN'\)/);
});

test('schema and migration are additive and use encrypted-secret/hash fields', () => {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert.match(schema, /model AdminTwoFactor/);
  assert.match(schema, /model TwoFactorChallenge/);
  assert.match(schema, /secretCiphertext/);
  assert.match(schema, /recoveryCodeHashes\s+Json/);
  assert.match(migration, /CREATE TABLE "admin_two_factor"/);
  assert.match(migration, /CREATE TABLE "two_factor_challenges"/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DROP COLUMN/);
});
