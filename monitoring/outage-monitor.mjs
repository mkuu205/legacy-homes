#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const healthUrl = process.env.HEALTH_URL || 'https://api.legacyhomes.co.ke/api/health/live';
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 30000);
const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 10000);
const stateFile = process.env.STATE_FILE || './outage-monitor-state.json';
const recipientsFile = process.env.RECIPIENTS_FILE || './outage-recipients.json';
const resendApiKey = process.env.RESEND_API_KEY || '';
const emailFrom = process.env.OUTAGE_EMAIL_FROM || '';
const emailReplyTo = process.env.OUTAGE_EMAIL_REPLY_TO || '';
const serviceName = process.env.SERVICE_NAME || 'Legacy Homes';
const webUrl = process.env.WEB_URL || 'https://legacyhomes.co.ke';

if (!resendApiKey) throw new Error('RESEND_API_KEY is required');
if (!emailFrom) throw new Error('OUTAGE_EMAIL_FROM is required');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function saveState(state) {
  await mkdir(dirname(stateFile), { recursive: true });
  const temporaryFile = `${stateFile}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryFile, stateFile);
}

async function loadState() {
  return loadJson(stateFile, {
    status: 'UNKNOWN',
    incidentId: null,
    outageStartedAt: null,
    outageNotifiedAt: null,
    recoveryNotifiedAt: null,
  });
}

async function loadRecipients() {
  const recipients = await loadJson(recipientsFile, []);
  if (!Array.isArray(recipients)) throw new Error('RECIPIENTS_FILE must contain a JSON array');
  return [...new Set(recipients.map((value) => String(value).trim().toLowerCase()).filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))];
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function messageHtml({ recovered, outageStartedAt, recoveredAt }) {
  const title = recovered ? `${serviceName} is back online` : `${serviceName} is temporarily unavailable`;
  const body = recovered
    ? `Our services have recovered and are available again. You can return to <a href="${escapeHtml(webUrl)}">${escapeHtml(webUrl)}</a>.`
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

async function notifyAll(recovered, state) {
  const recipients = await loadRecipients();
  if (recipients.length === 0) throw new Error('No valid recipients configured');
  const recoveredAt = new Date().toISOString();
  const subject = recovered ? `${serviceName} is back online` : `${serviceName} service interruption`;
  const html = messageHtml({ recovered, outageStartedAt: state.outageStartedAt, recoveredAt });
  const failed = [];

  for (let index = 0; index < recipients.length; index += 4) {
    const batch = recipients.slice(index, index + 4);
    const results = await Promise.allSettled(batch.map((recipient) => sendEmail(
      recipient,
      subject,
      html,
      `legacy-homes-${recovered ? 'recovery' : 'outage'}-${state.incidentId}-${recipient}`,
    )));
    results.forEach((result, offset) => { if (result.status === 'rejected') failed.push(batch[offset]); });
    if (index + 4 < recipients.length) await sleep(250);
  }

  if (failed.length > 0) throw new Error(`${failed.length} notification deliveries failed`);
}

async function poll() {
  const state = await loadState();
  const online = await checkHealth();
  const now = new Date().toISOString();

  if (!online) {
    if (state.status !== 'OFFLINE') {
      state.status = 'OFFLINE';
      state.incidentId = `incident-${Date.now()}`;
      state.outageStartedAt = now;
      state.outageNotifiedAt = null;
      state.recoveryNotifiedAt = null;
      await saveState(state);
      console.error(`[outage-monitor] backend offline at ${now}`);
    }
    if (!state.outageNotifiedAt) {
      try {
        await notifyAll(false, state);
        state.outageNotifiedAt = now;
        await saveState(state);
        console.log(`[outage-monitor] outage notification recorded at ${now}`);
      } catch (error) {
        console.error(`[outage-monitor] outage notification failed: ${error.message}`);
      }
    }
    return;
  }

  if (state.status === 'OFFLINE' && !state.recoveryNotifiedAt) {
    try {
      await notifyAll(true, state);
      state.recoveryNotifiedAt = now;
      state.status = 'ONLINE';
      await saveState(state);
      console.log(`[outage-monitor] recovery notification recorded at ${now}`);
    } catch (error) {
      console.error(`[outage-monitor] recovery notification failed: ${error.message}`);
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
