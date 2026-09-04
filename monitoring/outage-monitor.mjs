#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const healthUrl = process.env.HEALTH_URL || 'https://api.legacyhomes.co.ke/api/health/live';
const recipientSyncUrl = process.env.RECIPIENT_SYNC_URL || 'https://api.legacyhomes.co.ke/api/auth/internal/outage-recipients';
const monitorSecret = process.env.OUTAGE_MONITOR_SECRET || '';
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 30000);
const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 10000);
const failureThreshold = Math.max(1, Number(process.env.FAILURE_THRESHOLD || 2));
const recoveryThreshold = Math.max(1, Number(process.env.RECOVERY_THRESHOLD || 2));
const retryBaseMs = Math.max(1000, Number(process.env.RETRY_BASE_MS || 30000));
const retryMaxMs = Math.max(retryBaseMs, Number(process.env.RETRY_MAX_MS || 15 * 60 * 1000));
const stateFile = process.env.STATE_FILE || './outage-monitor-state.json';
const recipientsFile = process.env.RECIPIENTS_FILE || './outage-recipients.json';
const adminRecipientsFile = process.env.ADMIN_RECIPIENTS_FILE || './outage-admin-recipients.json';
const resendApiKey = process.env.RESEND_API_KEY || '';
const emailFrom = process.env.OUTAGE_EMAIL_FROM || '';
const emailReplyTo = process.env.OUTAGE_EMAIL_REPLY_TO || '';
const serviceName = process.env.SERVICE_NAME || 'Legacy Homes';
const webUrl = process.env.WEB_URL || 'https://legacyhomes.co.ke';

if (!resendApiKey) throw new Error('RESEND_API_KEY is required');
if (!emailFrom) throw new Error('OUTAGE_EMAIL_FROM is required');
if (!monitorSecret) throw new Error('OUTAGE_MONITOR_SECRET is required');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const normalizeEmails = (values) => [...new Set(values.map((value) => String(value).trim().toLowerCase()).filter(validEmail))];

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function saveJsonAtomic(file, value) {
  await mkdir(dirname(file), { recursive: true });
  const temporaryFile = `${file}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryFile, file);
}

async function loadState() {
  return loadJson(stateFile, {
    status: 'UNKNOWN',
    consecutiveFailures: 0,
    consecutiveHealthy: 0,
    incidentId: null,
    outageStartedAt: null,
    outageNotifiedAt: null,
    recoveryNotifiedAt: null,
    recipientSnapshotAt: null,
    deliveries: { outage: {}, recovery: {}, adminOutage: {}, adminRecovery: {} },
  });
}

async function loadRecipients() {
  const recipients = await loadJson(recipientsFile, []);
  if (!Array.isArray(recipients)) throw new Error('RECIPIENTS_FILE must contain a JSON array');
  return normalizeEmails(recipients);
}

async function loadAdminRecipients() {
  const recipients = await loadJson(adminRecipientsFile, []);
  if (!Array.isArray(recipients)) throw new Error('ADMIN_RECIPIENTS_FILE must contain a JSON array');
  return normalizeEmails(recipients);
}

async function checkHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(healthUrl, { signal: controller.signal, headers: { accept: 'application/json' } });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function syncRecipients() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(recipientSyncUrl, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'x-outage-monitor-secret': monitorSecret },
    });
    if (!response.ok) throw new Error(`recipient sync returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.success || !Array.isArray(payload.recipients) || !Array.isArray(payload.admins)) {
      throw new Error('recipient sync returned an invalid snapshot');
    }
    await saveJsonAtomic(recipientsFile, normalizeEmails(payload.recipients));
    await saveJsonAtomic(adminRecipientsFile, normalizeEmails(payload.admins));
    return payload.generatedAt || new Date().toISOString();
  } finally {
    clearTimeout(timeout);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function messageHtml({ recovered, outageStartedAt, recoveredAt, admin }) {
  const title = recovered ? `${serviceName} is back online` : `${serviceName} is temporarily unavailable`;
  const body = recovered
    ? `Our services have recovered and are available again. You can return to <a href="${escapeHtml(webUrl)}">${escapeHtml(webUrl)}</a>.`
    : admin
      ? 'The Legacy Homes backend is not responding within the configured health threshold. Please investigate the service and deployment logs.'
      : 'We are aware of the interruption and are working to restore service. Your account and billing data remain safe.';
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h2>${escapeHtml(title)}</h2><p>${body}</p><p><strong>Incident started:</strong> ${escapeHtml(outageStartedAt)}</p>${recovered ? `<p><strong>Recovered:</strong> ${escapeHtml(recoveredAt)}</p>` : ''}<p style="color:#64748b;font-size:12px">This is an automated ${escapeHtml(serviceName)} service notification.</p></body></html>`;
}

async function sendEmail(to, subject, html, idempotencyKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${resendApiKey}`,
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({ from: emailFrom, to: [to], subject, html, ...(emailReplyTo ? { reply_to: emailReplyTo } : {}) }),
    });
    if (!response.ok) throw new Error(`email provider returned HTTP ${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

function nextRetryAt(attempts) {
  return Date.now() + Math.min(retryMaxMs, retryBaseMs * (2 ** Math.max(0, attempts - 1)));
}

async function deliverGroup(state, group, recipients, subject, html, incidentId, now) {
  const ledger = state.deliveries[group] || (state.deliveries[group] = {});
  for (const recipient of recipients) {
    const entry = ledger[recipient] || { attempts: 0, sentAt: null, nextAttemptAt: 0, lastError: null };
    if (entry.sentAt || entry.nextAttemptAt > Date.now()) {
      ledger[recipient] = entry;
      continue;
    }
    entry.attempts += 1;
    try {
      await sendEmail(recipient, subject, html, `legacy-homes-${group}-${incidentId}-${recipient}`);
      entry.sentAt = now;
      entry.nextAttemptAt = 0;
      entry.lastError = null;
    } catch (error) {
      entry.nextAttemptAt = nextRetryAt(entry.attempts);
      entry.lastError = error instanceof Error ? error.message : String(error);
      console.error(`[outage-monitor] ${group} delivery failed for ${recipient}: ${entry.lastError}`);
    }
    ledger[recipient] = entry;
    await saveState(state);
  }
}

async function saveState(state) {
  await saveJsonAtomic(stateFile, state);
}

async function processIncident(state, recovered, now) {
  const recipients = await loadRecipients();
  const admins = await loadAdminRecipients();
  if (recipients.length === 0 && admins.length === 0) throw new Error('No valid recipient snapshot configured');
  const html = messageHtml({ recovered, outageStartedAt: state.outageStartedAt, recoveredAt: now, admin: false });
  const adminHtml = messageHtml({ recovered, outageStartedAt: state.outageStartedAt, recoveredAt: now, admin: true });
  const prefix = recovered ? 'back online' : 'service interruption';
  await deliverGroup(state, recovered ? 'recovery' : 'outage', recipients, `${serviceName} is ${prefix}`, html, state.incidentId, now);
  await deliverGroup(state, recovered ? 'adminRecovery' : 'adminOutage', admins, `${serviceName} ${recovered ? 'recovered' : 'outage alert'}`, adminHtml, state.incidentId, now);
  const userGroup = state.deliveries[recovered ? 'recovery' : 'outage'] || {};
  const adminGroup = state.deliveries[recovered ? 'adminRecovery' : 'adminOutage'] || {};
  const complete = [...recipients.map((email) => userGroup[email]), ...admins.map((email) => adminGroup[email])].every((entry) => entry?.sentAt);
  if (complete) {
    if (recovered) state.recoveryNotifiedAt = now;
    else state.outageNotifiedAt = now;
    await saveState(state);
  }
}

async function poll() {
  const state = await loadState();
  const online = await checkHealth();
  const now = new Date().toISOString();

  if (online) {
    state.consecutiveFailures = 0;
    state.consecutiveHealthy += 1;
    try {
      state.recipientSnapshotAt = await syncRecipients();
    } catch (error) {
      console.error(`[outage-monitor] recipient sync failed: ${error.message}`);
    }

    if (state.status === 'OFFLINE' && state.consecutiveHealthy >= recoveryThreshold) {
      if (!state.recoveryNotifiedAt) await processIncident(state, true, now);
      if (state.recoveryNotifiedAt) state.status = 'ONLINE';
    } else if (state.status !== 'OFFLINE') {
      state.status = 'ONLINE';
    }
    await saveState(state);
    return;
  }

  state.consecutiveHealthy = 0;
  state.consecutiveFailures += 1;
  if (state.status !== 'OFFLINE' && state.consecutiveFailures >= failureThreshold) {
    state.status = 'OFFLINE';
    state.incidentId = `incident-${Date.now()}`;
    state.outageStartedAt = now;
    state.outageNotifiedAt = null;
    state.recoveryNotifiedAt = null;
    state.deliveries = { outage: {}, recovery: {}, adminOutage: {}, adminRecovery: {} };
    console.error(`[outage-monitor] backend outage threshold reached at ${now}`);
  }
  if (state.status === 'OFFLINE' && !state.outageNotifiedAt) {
    await processIncident(state, false, now);
  }
  await saveState(state);
}

await poll();
setInterval(() => poll().catch((error) => console.error(`[outage-monitor] poll failed: ${error.message}`)), pollIntervalMs);
