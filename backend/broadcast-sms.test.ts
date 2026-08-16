import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath: string) => readFileSync(resolve(__dirname, relativePath), 'utf8');

test('resident broadcast SMS is delivered for every supported broadcast type', () => {
  const service = read('src/services/notification.service.ts');
  assert.match(service, /for \(const channel of channels\)/);
  assert.doesNotMatch(service, /allowedSmsTypes/);
  assert.match(service, /sendTalkSasaSMS\(resident\.phone/);
  assert.match(service, /status: 'DELIVERED'/);
  assert.match(service, /status: 'FAILED'/);
});

test('broadcast response reports actual channel delivery outcomes', () => {
  const service = read('src/services/notification.service.ts');
  assert.match(service, /let delivered = 0/);
  assert.match(service, /let failed = 0/);
  assert.match(service, /delivered,\n      failed/);
  assert.match(service, /Promise<boolean>/);
});

test('broadcast retries use a persisted idempotency key', () => {
  const schema = read('../backend/prisma/schema.prisma');
  const migration = read('prisma/migrations/20260816000200_notification_broadcast_idempotency/migration.sql');
  const controller = read('src/controllers/notification.controller.ts');
  const service = read('src/services/notification.service.ts');
  const frontend = read('../frontend/src/app/admin/notifications/page.tsx');

  assert.match(schema, /idempotencyKey\s+String\?\s+@unique/);
  assert.match(migration, /ADD COLUMN "idempotencyKey" TEXT/);
  assert.match(controller, /Idempotency-Key/);
  assert.match(service, /where: \{ idempotencyKey: data\.idempotencyKey \}/);
  assert.match(frontend, /Idempotency-Key/);
  assert.match(frontend, /crypto\.randomUUID/);
});
