# Legacy Homes outage monitor

This monitor is intentionally independent of the Railway backend. Run it on a separate always-on worker with persistent storage so it can detect a Railway outage even when the website API is unavailable. It polls the production health endpoint, persists incident state, and sends one outage email and one recovery email per incident.

## Configuration

```text
HEALTH_URL=https://api.legacyhomes.co.ke/api/health/live
POLL_INTERVAL_MS=30000
REQUEST_TIMEOUT_MS=10000
STATE_FILE=/var/lib/legacy-homes/outage-monitor-state.json
RECIPIENTS_FILE=/etc/legacy-homes/outage-recipients.json
RESEND_API_KEY=<secret>
OUTAGE_EMAIL_FROM=Legacy Homes <alerts@your-domain.example>
OUTAGE_EMAIL_REPLY_TO=<optional reply address>
SERVICE_NAME=Legacy Homes
WEB_URL=https://legacyhomes.co.ke
```

`RECIPIENTS_FILE` must contain a JSON array of registered notification recipients. Keep it outside Git and update it through a secure user-management process. Do not put email addresses, API keys, database credentials, or other secrets in the repository.

The monitor uses provider idempotency keys derived from the incident ID and recipient address. It persists state atomically, retries failed deliveries on the next poll, batches deliveries with bounded concurrency, and does not send duplicate outage or recovery messages for the same incident.

## Run

```sh
pnpm install --frozen-lockfile
node outage-monitor.mjs
```

Run it under a supervisor such as systemd, Docker, or an independent managed worker. The monitor must not run on the same Railway service as the API, because that would remove its ability to detect a complete Railway outage.

## Required production setup

Set the website build variable `NEXT_PUBLIC_API_URL` to `https://api.legacyhomes.co.ke` (the client normalizes the `/api` suffix). Configure the same production API URL in every browser-facing request path. The legacy Render URL is not a valid fallback and is intentionally not used.

Configure the monitor’s email provider credentials and recipient file in the independent worker environment. Verify that the worker has persistent write access to `STATE_FILE`, outbound HTTPS access to the health endpoint and email provider, and a process supervisor restart policy.
