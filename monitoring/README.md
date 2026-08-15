# Legacy Homes outage monitor

This monitor is intentionally independent of the backend process. Run it on a separate host or monitoring worker with persistent storage. It polls the backend health endpoint, stores outage state in `STATE_FILE`, and calls the recovery callback exactly once after an observed offline-to-online transition.

Example environment variable names:

```text
HEALTH_URL
RECOVERY_URL
OUTAGE_MONITOR_SECRET
POLL_INTERVAL_MS
STATE_FILE
```

The same random secret must be configured as `OUTAGE_MONITOR_SECRET` on the backend and monitor. The monitor requires Node.js 18 or newer, uses only built-in APIs, and should run under a supervisor such as systemd, Docker, or a managed process runner. Do not run it on the same host or process supervisor as the backend if the objective is independent outage detection.

The monitor does not expose Firebase Admin credentials, SMTP credentials, database credentials, or authorization tokens. It only sends the configured recovery secret in the dedicated `x-outage-monitor-secret` header.
