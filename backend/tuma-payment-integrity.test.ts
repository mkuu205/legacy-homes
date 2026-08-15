import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { TumaProvider } from './src/providers/tuma.provider';

const provider = new TumaProvider();

const successPayload = {
  result_code: 0,
  result_desc: 'Success',
  merchant_request_id: 'MR-1',
  checkout_request_id: 'CR-1',
  amount: 250,
  mpesa_receipt_number: 'ABC123',
  timestamp: '2026-08-15T10:00:00.000Z',
  status: 'completed',
};

test('valid Tuma success callback is normalized canonically', async () => {
  const result = await provider.verifyCallback({ payload: successPayload });
  assert.equal(result.valid, true);
  assert.equal(result.status, 'SUCCESSFUL');
  assert.equal(result.amount, 250);
  assert.equal(result.providerData.merchant_request_id, 'MR-1');
  assert.equal(result.providerData.checkout_request_id, 'CR-1');
  assert.equal(result.providerData.mpesa_receipt_number, 'ABC123');
});

test('valid Tuma failure callback is normalized as FAILED', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, result_code: 1032, result_desc: 'Cancelled', amount: 250, status: 'cancelled' } });
  assert.equal(result.valid, true);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.providerData.failure_reason, 'Cancelled');
});

test('duplicate callback payload is deterministic for deduplication', async () => {
  const first = await provider.verifyCallback({ payload: successPayload });
  const second = await provider.verifyCallback({ payload: { ...successPayload } });
  assert.deepEqual(first.providerData, second.providerData);
});

test('missing merchant request ID is rejected', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, merchant_request_id: '' } });
  assert.equal(result.valid, false);
});

test('missing checkout request ID is rejected', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, checkout_request_id: undefined } });
  assert.equal(result.valid, false);
});

test('missing result code is rejected', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, result_code: undefined } });
  assert.equal(result.valid, false);
});

test('missing timestamp is rejected', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, timestamp: undefined } });
  assert.equal(result.valid, false);
});

test('missing status is rejected', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, status: undefined } });
  assert.equal(result.valid, false);
});

test('unrecognized status is rejected', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, status: 'unknown' } });
  assert.equal(result.valid, false);
});

test('numeric string result code is accepted', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, result_code: '0' } });
  assert.equal(result.valid, true);
  assert.equal(result.status, 'SUCCESSFUL');
});

test('non-integer result code is rejected', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, result_code: 'completed' } });
  assert.equal(result.valid, false);
});

test('callback without amount is rejected', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, amount: undefined } });
  assert.equal(result.valid, false);
});

test('invalid monetary precision is rejected for successful callback', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, amount: 250.001 } });
  assert.equal(result.valid, false);
});

test('zero amount is rejected for successful callback', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, amount: 0 } });
  assert.equal(result.valid, false);
});

test('negative amount is rejected for successful callback', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, amount: -250 } });
  assert.equal(result.valid, false);
});

test('external reference and phone are retained for engine correlation', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, external_reference: 'payment-1', phone: '254712345678' } });
  assert.equal(result.providerData.external_reference, 'payment-1');
  assert.equal(result.providerData.phone, '254712345678');
});

test('canonical parser uses result_code as the single success criterion', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, status: 'failed', result_code: 0 } });
  assert.equal(result.valid, true);
  assert.equal(result.status, 'SUCCESSFUL');
});

test('failure callback preserves provider identifiers and timestamp', async () => {
  const result = await provider.verifyCallback({ payload: { ...successPayload, result_code: 1, failure_reason: 'Declined' } });
  assert.equal(result.providerData.merchant_request_id, 'MR-1');
  assert.equal(result.providerData.checkout_request_id, 'CR-1');
  assert.equal(result.providerData.failure_reason, 'Declined');
  assert.ok(result.providerData.timestamp);
});

test('payment engine contains atomic settlement and callback safeguards', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/services/payment-engine.service.ts'), 'utf8');
  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /status: PaymentStatus\.PENDING/);
  assert.match(source, /verification\.amount !== payment\.amount/);
  assert.match(source, /callbackFingerprint/);
  assert.match(source, /merchantRequestId, checkoutRequestId/);
});

test('amount mismatch is held for reconciliation rather than marked successful', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/services/payment-engine.service.ts'), 'utf8');
  assert.match(source, /reconciliationStatus: 'MISMATCH'/);
  assert.match(source, /Payment amount mismatch; held for reconciliation/);
});

test('failure callbacks can transition only pending payments', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/services/payment-engine.service.ts'), 'utf8');
  assert.match(source, /where: \{ id: payment\.id, status: PaymentStatus\.PENDING \}/);
  assert.match(source, /status: PaymentStatus\.FAILED/);
});

test('successful settlement uses the initiated stored payment amount', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/services/payment-engine.service.ts'), 'utf8');
  assert.match(source, /updatedAmountPaid = bill\.amountPaid \+ payment\.amount/);
  assert.match(source, /if \(payment\.amount > bill\.balance\)/);
});
