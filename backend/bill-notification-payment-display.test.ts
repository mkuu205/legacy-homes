import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const billingService = fs.readFileSync('src/services/billing.service.ts', 'utf8');
const notificationService = fs.readFileSync('src/services/notification.service.ts', 'utf8');
const paymentsPage = fs.readFileSync('../frontend/src/app/dashboard/payments/page.tsx', 'utf8');

test('bill generation has one bill email dispatch path', () => {
  assert.equal(
    (billingService.match(/sendBillNotificationEmail\(/g) || []).length,
    1,
    'billing must retain one detailed bill email dispatch'
  );
  assert.doesNotMatch(
    notificationService,
    /subject:\s*["']Your Water Bill - Legacy Homes["']|Your Water Bill is Ready/,
    'notification service must not send a duplicate bill email'
  );
  assert.match(
    billingService,
    /sendBillNotificationEmail[\s\S]*?billingMonth[\s\S]*?dueDate/,
    'the retained email path must receive billing period and due date'
  );
});

test('payment details use authoritative bill fields', () => {
  assert.match(paymentsPage, /formatMoney\(selectedBill\.totalAmount\)/);
  assert.match(paymentsPage, /formatMoney\(selectedBill\.amountPaid\)/);
  assert.match(paymentsPage, /formatMoney\(selectedBill\.balance\)/);
  assert.doesNotMatch(paymentsPage, /formatMoney\(selectedBill\.amount\)/);
});
