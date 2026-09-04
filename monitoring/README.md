# Legacy Homes independent outage monitor

This worker must run outside Railway on an always-on host with persistent storage. It checks the production health endpoint, synchronizes the authoritative eligible-recipient snapshot while the API is healthy, and then continues outage and recovery delivery from the last protected snapshot if Railway becomes unreachable.

## Required environment

| Variable | Purpose |
|---|---|
| `HEALTH_URL` | Production liveness URL, normally `https://api.legacyhomes.co.ke/api/health/live` |
| `RECIPIENT_SYNC_URL` | Protected snapshot URL, normally `https://api.legacyhomes.co.ke/api/auth/internal/outage-recipients` |
| `OUTAGE_MONITOR_SECRET` | Shared secret used in `x-outage-monitor-secret`; must match the backend and never be committed |
| `RESEND_API_KEY` | Email provider credential |
| `OUTAGE_EMAIL_FROM` | Verified sender address |
| `OUTAGE_EMAIL_REPLY_TO` | Optional reply-to address |
| `STATE_FILE` | Persistent JSON state path; do not place it on ephemeral storage |
| `RECIPIENTS_FILE` | Persistent user-recipient snapshot path |
| `ADMIN_RECIPIENTS_FILE` | Persistent administrator-recipient snapshot path |
| `FAILURE_THRESHOLD` | Consecutive failed health checks required to open an incident; default `2` |
| `RECOVERY_THRESHOLD` | Consecutive healthy checks required to declare recovery; default `2` |
| `RETRY_BASE_MS` / `RETRY_MAX_MS` | Exponential delivery retry bounds |

The backend snapshot includes only users with `ACTIVE` account status, `APPROVED` registration status, verified valid email addresses, and administrators identified by their administrator roles. Snapshots are written with a temporary file and atomic rename. A failed sync never replaces the last good snapshot.

## Incident guarantees

The monitor opens one incident only after the failure threshold is reached. Each incident has a durable per-recipient delivery ledger for user outage, administrator outage, user recovery, and administrator recovery messages. Resend idempotency keys are deterministic per incident, delivery group, and recipient. Failed deliveries retry with persisted exponential backoff, while successful deliveries are never sent again. Recovery requires the healthy threshold and uses the same ledger.

Administrators receive a separate technical alert path in addition to the user-facing notification path. The monitor does not call the removed public outage-subscription or recovery endpoints.

## Run

```bash
npm install
node incident-simulation.mjs
node outage-monitor.mjs
```

The worker is not a Railway process. Deploy it as a separate persistent service, cron-backed worker, or always-on VM process with restricted file permissions and secret storage. Never commit the state files, recipient snapshots, or credentials.
