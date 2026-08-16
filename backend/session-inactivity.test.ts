import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { isSessionInactive, SESSION_EXPIRED_MESSAGE } from './src/utils/session-policy';

const read = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

test('sessions remain active before 24 hours of inactivity and expire at 24 hours', () => {
  const createdAt = new Date('2026-08-15T00:00:00.000Z');
  assert.equal(
    isSessionInactive(createdAt, createdAt, new Date('2026-08-15T23:59:59.999Z')),
    false,
  );
  assert.equal(
    isSessionInactive(createdAt, createdAt, new Date('2026-08-16T00:00:00.000Z')),
    true,
  );
});

test('new activity timestamp takes precedence over session creation time', () => {
  const createdAt = new Date('2026-08-10T00:00:00.000Z');
  const lastActivityAt = new Date('2026-08-15T12:00:00.000Z');
  assert.equal(
    isSessionInactive(lastActivityAt, createdAt, new Date('2026-08-16T11:59:59.999Z')),
    false,
  );
  assert.equal(
    isSessionInactive(lastActivityAt, createdAt, new Date('2026-08-16T12:00:00.000Z')),
    true,
  );
});

test('backend binds access tokens to refresh sessions and revokes inactive sessions', () => {
  const authService = read('src/services/auth.service.ts');
  const middleware = read('src/middleware/auth.ts');
  assert.match(authService, /lastActivityAt: new Date\(\)/);
  assert.match(authService, /sessionId: storedToken\.id/);
  assert.match(authService, /data: \{ revoked: true \}/);
  assert.match(middleware, /payload\.sessionId/);
  assert.match(middleware, /lastActivityAt: new Date\(\)/);
  assert.match(middleware, /SESSION_EXPIRED_MESSAGE/);
});

test('frontend preserves the inactivity reason and displays the backend message', () => {
  const api = read('../frontend/src/lib/api.ts');
  const login = read('../frontend/src/app/login/page.tsx');
  assert.match(api, /sessionExpiryReason/);
  assert.match(login, /Your session has expired due to inactivity\. Please log in again\./);
});

test('expiry message is explicit and stable', () => {
  assert.equal(SESSION_EXPIRED_MESSAGE, 'Your session has expired due to inactivity. Please log in again.');
});
