#!/usr/bin/env node

import assert from 'node:assert/strict';

const state = {
  status: 'UNKNOWN',
  failures: 0,
  healthy: 0,
  incidentId: null,
  recipients: ['resident@example.com'],
  deliveries: {},
};
const failureThreshold = 2;
const recoveryThreshold = 2;
const retryBaseMs = 1000;
let now = 0;

function sampleHealth(online) {
  if (!online) {
    state.healthy = 0;
    state.failures += 1;
    if (state.status !== 'OFFLINE' && state.failures >= failureThreshold) {
      state.status = 'OFFLINE';
      state.incidentId = `incident-${now}`;
    }
    return;
  }
  state.failures = 0;
  state.healthy += 1;
  if (state.status === 'OFFLINE' && state.healthy >= recoveryThreshold) state.status = 'ONLINE';
  if (state.status !== 'OFFLINE') state.status = 'ONLINE';
}

function attempt(kind, recipient, succeeds) {
  const key = `${kind}:${state.incidentId}:${recipient}`;
  const entry = state.deliveries[key] || { attempts: 0, sentAt: null, nextAttemptAt: 0 };
  if (entry.sentAt !== null || entry.nextAttemptAt > now) return entry;
  entry.attempts += 1;
  if (succeeds) {
    entry.sentAt = now;
    entry.nextAttemptAt = 0;
  } else {
    entry.nextAttemptAt = now + retryBaseMs * (2 ** (entry.attempts - 1));
  }
  state.deliveries[key] = entry;
  return entry;
}

sampleHealth(false);
assert.equal(state.status, 'UNKNOWN');
sampleHealth(false);
assert.equal(state.status, 'OFFLINE');
const first = attempt('outage', state.recipients[0], true);
assert.equal(first.attempts, 1);
assert.equal(attempt('outage', state.recipients[0], true).attempts, 1);

now += 1000;
const retrying = attempt('recovery', state.recipients[0], false);
assert.equal(retrying.attempts, 1);
assert.equal(attempt('recovery', state.recipients[0], false).attempts, 1);
now += 1000;
const recoveredDelivery = attempt('recovery', state.recipients[0], true);
assert.equal(recoveredDelivery.attempts, 2);
assert.ok(recoveredDelivery.sentAt !== null);

sampleHealth(true);
assert.equal(state.status, 'OFFLINE');
sampleHealth(true);
assert.equal(state.status, 'ONLINE');
assert.equal(Object.keys(state.deliveries).length, 2);
console.log('incident simulation passed: threshold, deduplication, retry backoff, recovery, and durable ledger');
