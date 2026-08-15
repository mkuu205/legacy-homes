import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) => readFileSync(resolve(__dirname, relativePath), 'utf8');

test('DeviceToken is a real multi-device Prisma model with safe user ownership', () => {
  const schema = read('../backend/prisma/schema.prisma');
  const migration = read('../backend/prisma/migrations/20260815000300_device_tokens/migration.sql');
  const controller = read('src/controllers/notification.controller.ts');
  assert.match(schema, /model DeviceToken/);
  assert.match(schema, /@@unique|token\s+String\s+@unique/);
  assert.match(migration, /CREATE TABLE "device_tokens"/);
  assert.match(controller, /prisma\.deviceToken\.upsert/);
  assert.match(controller, /residentId: req\.user!\.userId/);
  assert.match(controller, /updateMany/);
});

test('invalid FCM tokens are retained but deactivated', () => {
  const firebase = read('src/services/firebase.service.ts');
  assert.match(firebase, /active: false/);
  assert.match(firebase, /updateMany/);
  assert.doesNotMatch(firebase, /deleteMany|delete\(/);
});

test('notification APIs preserve user-scoped records and read state', () => {
  const service = read('src/services/notification.service.ts');
  const controller = read('src/controllers/notification.controller.ts');
  const routes = read('src/routes/notification.routes.ts');
  assert.match(service, /where:\s*\{\s*userId,/);
  assert.match(service, /status:\s*'READ'/);
  assert.match(service, /readAt:\s*new Date\(\)/);
  assert.match(controller, /getResidentNotifications\(req\.user!\.userId/);
  assert.match(routes, /get\('\/my', authenticate/);
});

test('notification channel failures are isolated from the broadcast loop', () => {
  const service = read('src/services/notification.service.ts');
  assert.match(service, /status:\s*'FAILED'/);
  assert.match(service, /Failed to deliver/);
  assert.match(service, /for \(const resident of residents\)/);
});

test('email transport has bounded retries and does not log message contents or credentials', () => {
  const email = read('src/utils/email.ts');
  assert.match(email, /EMAIL_MAX_ATTEMPTS/);
  assert.match(email, /maxAttempts/);
  assert.match(email, /setTimeout/);
  assert.doesNotMatch(email, /BREVO_API_KEY.*logger|html.*logger/);
});

test('health endpoint distinguishes process readiness from database dependency health', () => {
  const server = read('src/server.ts');
  assert.match(server, /await prisma\.\$queryRaw`SELECT 1`/);
  assert.match(server, /status\(ready \? 200 : 503\)/);
  assert.match(server, /dependencies: \{ database \}/);
  assert.doesNotMatch(server, /outageService\.startRecoveryMonitor/);
});

test('frontend FCM uses a production service worker without Admin credentials', () => {
  const firebase = read('../frontend/src/lib/firebase.ts');
  const worker = read('../frontend/public/firebase-messaging-sw.js');
  assert.match(firebase, /firebase-messaging-sw\.js\?config=/);
  assert.match(firebase, /serviceWorkerRegistration/);
  assert.match(worker, /firebase-messaging-compat/);
  assert.match(worker, /onBackgroundMessage/);
  assert.match(worker, /notificationclick/);
  assert.doesNotMatch(worker, /FIREBASE_ADMIN|private_key|client_email/);
});

test('recovery callback is secret-protected and monitor state is external to the backend', () => {
  const controller = read('src/controllers/outage.controller.ts');
  const routes = read('src/routes/auth.routes.ts');
  const monitor = read('../monitoring/outage-monitor.mjs');
  const outage = read('src/services/outage.service.ts');
  assert.match(controller, /OUTAGE_MONITOR_SECRET/);
  assert.match(controller, /timingSafeEqual/);
  assert.match(routes, /outage-recovered/);
  assert.match(monitor, /STATE_FILE/);
  assert.match(monitor, /healthUrl/);
  assert.match(monitor, /x-outage-monitor-secret/);
  assert.match(outage, /async notifySubscribers/);
});

test('recovery notifications are one-shot per persisted subscription', () => {
  const outage = read('src/services/outage.service.ts');
  assert.match(outage, /isActive:\s*true/);
  assert.match(outage, /isNotified:\s*false/);
  assert.match(outage, /isNotified:\s*true/);
  assert.match(outage, /isActive:\s*false/);
});
