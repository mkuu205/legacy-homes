#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const healthUrl = process.env.HEALTH_URL || 'https://api.legacyhomes.co.ke/api/health';
const recoveryUrl = process.env.RECOVERY_URL || 'https://api.legacyhomes.co.ke/api/auth/outage-recovered';
const monitorSecret = process.env.OUTAGE_MONITOR_SECRET || '';
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 30000);
const stateFile = process.env.STATE_FILE || './outage-monitor-state.json';

if (!monitorSecret) {
  throw new Error('OUTAGE_MONITOR_SECRET is required');
}

async function loadState() {
  try {
    return JSON.parse(await readFile(stateFile, 'utf8'));
  } catch {
    return { status: 'UNKNOWN', outageStartedAt: null, recoveryNotifiedAt: null };
  }
}

async function saveState(state) {
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

async function checkHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(healthUrl, { signal: controller.signal, headers: { accept: 'application/json' } });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function notifyRecovery(state) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(recoveryUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-outage-monitor-secret': monitorSecret,
      },
      body: JSON.stringify({ outageStartedAt: state.outageStartedAt, recoveredAt: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`Recovery callback returned HTTP ${response.status}`);
    return true;
  } catch (error) {
    console.error(`[outage-monitor] recovery callback failed: ${error.message}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function poll() {
  const state = await loadState();
  const online = await checkHealth();
  const now = new Date().toISOString();

  if (!online) {
    if (state.status !== 'OFFLINE') {
      state.status = 'OFFLINE';
      state.outageStartedAt = now;
      state.recoveryNotifiedAt = null;
      await saveState(state);
      console.error(`[outage-monitor] backend offline at ${now}`);
    }
    return;
  }

  if (state.status === 'OFFLINE' && !state.recoveryNotifiedAt) {
    if (await notifyRecovery(state)) {
      state.recoveryNotifiedAt = now;
      state.status = 'ONLINE';
      await saveState(state);
      console.log(`[outage-monitor] recovery recorded at ${now}`);
    }
    return;
  }

  if (state.status !== 'ONLINE') {
    state.status = 'ONLINE';
    await saveState(state);
  }
}

await poll();
setInterval(() => poll().catch((error) => console.error(`[outage-monitor] poll failed: ${error.message}`)), pollIntervalMs);
