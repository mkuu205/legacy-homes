import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateBalance, calculateBillStatus, calculateWaterAmount, WATER_UNIT_RATE } from './src/utils/money';

test('water rate is fixed at KES 250 per unit', () => {
  assert.equal(WATER_UNIT_RATE.toFixed(2), '250.00');
  assert.equal(calculateWaterAmount(1).toFixed(2), '250.00');
  assert.equal(calculateWaterAmount(2).toFixed(2), '500.00');
  assert.equal(calculateWaterAmount(5).toFixed(2), '1250.00');
  assert.equal(calculateWaterAmount(10).toFixed(2), '2500.00');
});

test('billing balances and statuses use exact decimal arithmetic', () => {
  assert.equal(calculateBalance('1250.00', '500.00').toFixed(2), '750.00');
  assert.equal(calculateBalance('0.30', '0.10').toFixed(2), '0.20');
  assert.equal(calculateBillStatus('1250.00', '0.00', false), 'UNPAID');
  assert.equal(calculateBillStatus('1250.00', '500.00', false), 'PARTIAL');
  assert.equal(calculateBillStatus('1250.00', '1250.00', false), 'PAID');
  assert.equal(calculateBillStatus('1250.00', '0.00', true), 'OVERDUE');
});

test('alternate bill generator only selects readings that have not already been billed', () => {
  const source = readFileSync(resolve(__dirname, 'src/services/bill-generation.service.ts'), 'utf8');
  assert.match(source, /billingMonth,\s*billId: null/);
  assert.doesNotMatch(source, /bill\.deleteMany|payment\.deleteMany/);
});

test('financial bill deletion endpoints fail closed instead of destroying history', () => {
  const source = readFileSync(resolve(__dirname, 'src/services/billing.service.ts'), 'utf8');
  assert.match(source, /Financial bills cannot be deleted/);
  assert.doesNotMatch(source, /prisma\.bill\.deleteMany/);
});

 test('account deactivation retains financial records and invalidates sessions', () => {
  const residentSource = readFileSync(resolve(__dirname, 'src/services/resident.service.ts'), 'utf8');
  const authSource = readFileSync(resolve(__dirname, 'src/controllers/auth.controller.ts'), 'utf8');
  for (const source of [residentSource, authSource]) {
    assert.match(source, /accountStatus: 'INACTIVE'/);
    assert.match(source, /refreshToken\.deleteMany/);
    assert.doesNotMatch(source, /bill\.deleteMany/);
    assert.doesNotMatch(source, /payment\.deleteMany/);
  }
});

 test('billing schema uses Decimal for monetary fields', () => {
  const schema = readFileSync(resolve(__dirname, 'prisma/schema.prisma'), 'utf8');
  assert.doesNotMatch(schema, /unitRate\s+Float|totalAmount\s+Float|amountPaid\s+Float|balance\s+Float/);
  assert.match(schema, /unitRate\s+Decimal/);
  assert.match(schema, /totalAmount\s+Decimal/);
  assert.match(schema, /amountPaid\s+Decimal/);
  assert.match(schema, /balance\s+Decimal/);
});
