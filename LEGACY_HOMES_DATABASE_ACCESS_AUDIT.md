# Legacy Homes Database Access and Neon Compute Audit

**Author:** Manus AI
**Audit type:** Static repository audit with local build and focused-test validation
**Repository:** `mkuu205/legacy-homes`
**Scope:** Prisma access, duplicate reads, N+1 query patterns, polling, health checks, authentication/session access, notifications, payments, billing, reporting, and likely sources of Neon compute activity.
**Audit date:** 18 August 2026

## Executive summary

The audit found that the project now follows the shared Prisma singleton in application source code, but the database access layer still contains several material sources of unnecessary Neon work. The most significant issue is not the singleton architecture: it is query amplification in list, search, reporting, and dashboard paths, combined with recurring frontend polling that reaches PostgreSQL every 30 seconds.

The highest-confidence source of the reported high `SELECT 1` activity is the public health endpoint. Both `/health` and `/api/health` execute `prisma.$queryRaw\`SELECT 1\`` on every request in `backend/src/server.ts:183-205`. The payment engine contains a second `SELECT 1` implementation at `backend/src/services/payment-engine.service.ts:710-856`, which is likely used by an administrative/system-health path rather than by every public health request. The repository cannot prove the exact proportion of the reported Neon metric attributable to Railway probes, browser tabs, external monitoring, or administrative health checks because production request metrics were not available during this static audit.

The largest avoidable query volume is caused by per-row enrichment. Resident, search, report, and approval list methods fetch a base list and then perform one or more additional Prisma queries per returned row. A page of 50 bills can therefore issue approximately 1 base query plus up to 100 enrichment queries in the search service, or approximately 151 queries in the billing report when resident, meter, and house lookups are all distinct. The same pattern occurs in resident lists, overdue reports, revenue reports, consumption reports, and approval queues.

No application source files were changed during the audit. The only untracked runtime logs created by local test execution were removed. The working tree is clean.

## Priority summary

| Priority | Finding | Main evidence | Neon impact | Recommended action |
|---|---|---|---|---|
| **P0** | Public health requests execute a database probe on every request | `backend/src/server.ts:183-205` | High if Railway/external monitors/browser clients probe frequently; directly explains `SELECT 1` | Separate liveness from readiness, reduce probe frequency, and avoid browser-wide 30-second database probes unless required |
| **P0** | N+1 enrichment in reports, search, resident lists, and approval lists | `search.service.ts`, `resident.service.ts`, `report.service.ts`, `resident-approval.service.ts` | High under admin usage; query count grows linearly with page/report size | Replace per-row lookups with Prisma `include`/nested `select`, joins through relations, or batched `findMany` by IDs |
| **P1** | Resident and admin notification polling every 30 seconds | `frontend/src/app/dashboard/layout.tsx:51-89`, `frontend/src/app/admin/layout.tsx:57-94` | Medium to high; each authenticated tab continuously queries notifications | Prefer Socket.IO/event-driven invalidation, increase interval, pause when hidden, and deduplicate with a shared query cache |
| **P1** | Resident auth middleware performs a user read plus a refresh-token read and update on every authenticated request | `backend/src/middleware/auth.ts:27-69` | High at normal API traffic volume; one authenticated API call can generate three database operations before controller logic | Reduce session-touch frequency, use a bounded activity update window, and avoid updating `lastActivityAt` on every request |
| **P1** | Resident dashboard performs multiple independent reads plus follow-up house and meter queries | `resident.service.ts:265-317` | Medium; dashboard loads are common and can be multiplied by polling/page navigation | Use relation projections and a single dashboard read strategy; retain the unread count as a scoped aggregate |
| **P1** | Admin dashboard stats performs 12 parallel aggregates/counts and six sequential monthly aggregates | `report.service.ts:211-285` | Medium to high on every admin dashboard load | Consolidate counts/aggregates, cache short-lived dashboard metrics, and compute six-month trend in one grouped query |
| **P2** | Global search always runs four independent searches, each with N+1 enrichment | `search.service.ts:6-20`, `:23-213` | Medium; expensive for every search keystroke/request | Debounce frontend calls, require a minimum query length, and use relation selects or batched enrichment |
| **P2** | `reset_*` password reset scan loads every reset setting and parses them in application memory | `auth.service.ts:470-510` | Low normally, but grows with stale reset records and is not indexed by token hash | Store reset tokens in a dedicated table keyed by hash, or at minimum clean expired settings and use a direct lookup |
| **P2** | Several legitimate payment callback/settlement queries are sequential but mostly intentional | `payment-engine.service.ts:366-699` | Low to medium; necessary for idempotency and financial integrity | Preserve transaction and locking behavior; optimize only after query timing proves a bottleneck |
| **P3** | Prisma logging is limited to errors, so query-level attribution is unavailable | `config/prisma.ts:8-10` | Indirect; prevents reliable production diagnosis | Add sampled, redacted query timing/metrics outside the request path, or use Neon/Railway observability |

## 1. Prisma client architecture

### Finding: application singleton is correctly centralized

The application Prisma client is created in exactly one runtime configuration file:

```text
backend/src/config/prisma.ts:1-21
```

The file uses a global cache in non-production environments and exports both named and default forms. A repository search found only two `new PrismaClient` construction sites: the shared runtime singleton and `backend/prisma/seed.ts`. The seed script is a separate CLI context and is not imported by the application runtime.

The runtime singleton is configured with `log: ['error']`, so it does not emit normal query logs. This is appropriate for production noise control, but it means the source repository alone cannot provide query counts, duration distributions, pool wait time, or the exact origin of Neon activity.

| Area | Result |
|---|---|
| Runtime Prisma client constructions | One shared singleton in `backend/src/config/prisma.ts` |
| Non-runtime construction | `backend/prisma/seed.ts` only |
| Direct `new PrismaClient` in controllers/services | None found |
| Prisma imports in application source | 37 files, using the shared configuration or generated client types |
| Required singleton remediation | None immediately required |

### Recommendation

Keep the singleton architecture. Do not create request-scoped Prisma clients. Add a separate, sampled query-observability mechanism only if needed, with parameter values redacted and without logging secrets or personal data.

## 2. Confirmed N+1 and query-amplification findings

### 2.1 Resident list

`ResidentService.getAllResidents` first executes a paginated `user.findMany` and a `user.count` in parallel at `resident.service.ts:25-46`. It then performs one `house.findUnique` for every resident with a house at `resident.service.ts:48-59`.

For a page of `N` residents, the method performs approximately:

```text
2 base queries + N house queries
```

The current default page size is 20, but the endpoint can accept a larger limit. The fix should use a relation projection, such as selecting `assignedHouse.houseNumber`, or a single batched house query keyed by the returned `houseId` values.

### 2.2 Global and advanced search

`SearchService.globalSearch` starts four searches in parallel: residents, bills, tickets, and meters (`search.service.ts:6-20`). Each search then enriches its own rows separately:

| Search type | Base query | Per-row enrichment |
|---|---:|---:|
| Residents | 1 | Up to 1 house lookup per resident |
| Bills | 1 | 1 resident + 1 house lookup per bill |
| Tickets | 1 | 1 resident lookup per ticket |
| Meters | 1 | 1 house lookup per meter |

With `take = 50` and all result sets full, the global search can issue one base query for each category plus as many as 200 enrichment queries. The use of `Promise.all` reduces wall-clock latency but does not reduce Neon compute or total database work.

`advancedSearch` duplicates the same patterns for each selected resource type. The preferred remediation is relation-based `select`/`include`; the fallback is to collect unique foreign keys and issue one `findMany` per related model, then map results in memory.

### 2.3 Reports

The reporting service contains four confirmed N+1 paths:

* `getBillingReport` loads all matching bills and then performs resident, meter, and house lookups per bill (`report.service.ts:9-65`).
* `getRevenueReport` loads payments and then performs a resident lookup and conditional house lookup per payment (`report.service.ts:73-115`).
* `getOverdueReport` performs resident, meter, and house lookups per overdue bill (`report.service.ts:119-161`).
* `getConsumptionReport` performs meter, house, and resident lookups per reading (`report.service.ts:168-208`).

These methods also have no explicit pagination in the cited implementation. Large historical datasets can therefore multiply both memory use and database work. Reports should have bounded pagination or streaming/export-specific paths, and relations should be loaded through nested Prisma selection.

### 2.4 Approval queues

The resident approval service uses a base resident list followed by one house lookup per returned resident in its pending and approved list paths. Bulk approval also re-queries affected users and performs a house lookup per resident before sending email. The transactional house assignment operations are not inherently problematic; they protect financial/account integrity and should not be removed merely to reduce query count.

### 2.5 Admin dashboard statistics

`getAdminDashboardStats` executes 12 independent count/aggregate operations in parallel (`report.service.ts:217-249`) and then runs six monthly `payment.aggregate` calls sequentially (`report.service.ts:251-264`). This is not a classic N+1 loop over rows, but it is query amplification on every dashboard request:

```text
12 initial aggregate/count queries + 6 sequential monthly aggregates = 18 aggregate/count queries
```

The six-month trend should be computed by one grouped query or a database view/materialized summary. The first 12 metrics can also be consolidated where practical, although preserving separate semantics is more important than forcing one complex query.

## 3. Authentication and session database activity

### 3.1 Auth middleware activity on every authenticated request

`authMiddleware` performs the following operations for each request with a valid access token and session ID (`backend/src/middleware/auth.ts:27-69`):

1. `user.findUnique` to verify that the user still exists and is active.
2. `refreshToken.findUnique` to verify the bound session, revocation, expiry, and inactivity timestamp.
3. `refreshToken.update` to write `lastActivityAt` on every successful request.

The first two reads are security checks. The third operation is the main avoidable write amplification. In an active frontend that makes several API calls during page load and then polls, the same session row may be updated repeatedly within seconds.

### Recommendation

Retain account-status and session-revocation enforcement, but change session activity persistence to a bounded update policy. For example, update `lastActivityAt` only when the previous value is older than a configured interval such as five or fifteen minutes, using a conditional update. This preserves the 24-hour inactivity policy while materially reducing writes. The policy must be reviewed carefully because it affects security semantics.

### 3.2 Additional downstream user reads

After middleware has loaded the authenticated user, many controllers/services load the same user again. `getResidentDashboard`, profile operations, payment initiation, and other service paths use their own `user.findUnique`/`findFirst` calls. This is not always removable because downstream code may need different fields or enforce resource ownership, but request context could safely carry the minimal authenticated identity and role. Ownership-sensitive methods should still perform a database check when required.

### 3.3 Password reset scan

`AuthService.resetPassword` loads every system setting whose key starts with `reset_` and scans them in application memory (`auth.service.ts:480-500`). This is not a major recurring query under normal volume, but it is unbounded and becomes less efficient as expired reset entries accumulate. A dedicated reset-token table keyed by token hash is the safer long-term design.

## 4. Notification polling and unread-count activity

### 4.1 Resident dashboard

`frontend/src/app/dashboard/layout.tsx:51-89` performs an immediate request and then polls every 30 seconds:

```text
GET /notifications/my?limit=1
```

The response uses the backend `unread` or `unreadCount` field as the authoritative value, which is correct for data integrity. However, the 30-second loop remains a continuous database-backed request for every open resident dashboard tab.

### 4.2 Admin dashboard

`frontend/src/app/admin/layout.tsx:57-94` performs the same immediate-plus-30-second pattern against:

```text
GET /notifications/all?limit=1
```

It reads the backend-provided `unreadCount`. The endpoint is not a local-only counter; it invokes notification persistence queries. Thus, each open admin tab continues to produce database activity even when no notification state changes.

### 4.3 Health provider and local timers

`frontend/src/components/providers/health-check-provider.tsx` schedules backend health checks, while `backend-status-provider.tsx:42-48` runs a one-second local timer only to update outage-duration state. The one-second timer does not itself access PostgreSQL. The connection-recovery and toast timers are also local control-flow timers.

### Recommendation

Use Socket.IO events already present in the system to invalidate or refresh notification state rather than polling continuously. A robust transitional design is:

1. Fetch the authoritative unread count on mount and window focus.
2. Refresh immediately when a notification-created/read event arrives.
3. Pause polling while `document.visibilityState === 'hidden'`.
4. If polling is retained as a fallback, increase the interval and use one shared React Query/SWR cache per authenticated user rather than separate layout loops.

## 5. `SELECT 1` and health-check analysis

### 5.1 Public health endpoint: confirmed database query

The public handler at `backend/src/server.ts:183-205` is registered twice:

```text
GET /api/health
GET /health
```

Every request executes:

```ts
await prisma.$queryRaw`SELECT 1`;
```

The endpoint is intentionally uncached and returns 503 when the database probe fails. This makes it a valid readiness check, but it also means every Railway health probe, external uptime monitor, browser health check, and manual request consumes a database round trip.

The frontend `checkBackendHealth` function calls `/health`, and the health-check provider schedules recurring checks. The exact interval is implemented by recursive scheduling in `frontend/src/components/providers/health-check-provider.tsx`, so the frontend is a confirmed potential contributor to database probes. The static repository does not establish how many browser sessions are active in production.

### 5.2 Payment engine system health: second database probe

`PaymentEngineService.checkSystemHealth` performs another `prisma.$queryRaw\`SELECT 1\`` at `payment-engine.service.ts:721-728`, then checks provider configuration and environment presence. This is separate from the public `healthHandler`. If an admin system-health page polls or calls this method repeatedly, it creates additional `SELECT 1` traffic.

### 5.3 Attribution of the reported high metric

The repository can confirm two code-level sources, but it cannot responsibly claim that either one alone generated the complete reported metric. The likely contributors are:

| Contributor | Evidence | Confidence |
|---|---|---|
| Railway or external readiness probes | Public health endpoint executes `SELECT 1` | High as a mechanism; production frequency unknown |
| Browser-wide health provider | Frontend calls `/health` on a recurring schedule | High as a mechanism; active-tab count unknown |
| Admin system-health requests | Payment engine has an independent `SELECT 1` | Medium; caller frequency requires route/production logs |
| Prisma connection validation | Possible driver/pool behavior | Not established by repository source; requires Neon/Railway metrics |

### Recommended remediation sequence

First, identify the caller distribution from Railway access logs and Neon query metadata. Then separate liveness from readiness. A liveness endpoint should not query PostgreSQL and can return process health immediately. A readiness endpoint may query the database but should be called only by the deployment platform at a controlled cadence. Browser clients should consume a lightweight API status signal or use a substantially lower-frequency readiness check.

Do not remove database readiness checks blindly: production deployment behavior depends on them. The change should preserve the ability to detect a truly unavailable database while preventing every browser tab from acting as a database monitor.

## 6. Notifications, billing, and payments

### Notifications

The notification service correctly uses user-scoped notification records and unread counts. The audit did not identify evidence that the unread count is hardcoded. The issue is frequency, not authority: the frontend polls a correct backend aggregate too often.

### Resident dashboard

`ResidentService.getResidentDashboard` performs four parallel operations for user, current bill, recent payments, and unread count (`resident.service.ts:265-295`). It then performs a house lookup and a meter-reading query (`resident.service.ts:299-309`). The query shape is understandable, but the follow-up house and meter query can be combined with relation-based projections. The dashboard also competes with the layout’s notification polling, which independently queries notification data.

### Payment initiation

`PaymentEngineService.initiatePayment` reads the bill with its resident, aggregates pending payments, creates a payment, calls the external provider, and updates the payment record (`payment-engine.service.ts:102-247`). The aggregate is necessary to reserve outstanding balance safely. The two payment updates after provider interaction are not candidates for removal without changing payment integrity. The main optimization opportunity is to ensure indexes support `payment.billId + status` and ownership filters.

### Payment callbacks and settlement

Callback processing uses callback-audit idempotency records and payment lookups. Successful settlement uses row locks on payment and bill rows inside a transaction (`payment-engine.service.ts:601-699`). These queries are security and financial-integrity controls. They should be optimized only after timing evidence identifies a real bottleneck. Removing them to reduce Neon compute would create a much greater correctness risk.

## 7. Index and schema considerations

The static pass identified many query predicates that should be checked against production indexes, especially:

| Query family | Important columns to verify |
|---|---|
| User lists/search | `role`, `accountStatus`, `createdAt`, exact foreign-key lookups; PostgreSQL substring search may need specialized indexes if heavily used |
| Notification reads/counts | `userId`, `channel`, `status`, and ordering timestamp |
| Session validation | `refreshToken.id`, `refreshToken.tokenHash`, `userId`, `revoked`, `expiresAt` |
| Payment reservation | `billId`, `status` |
| Callback idempotency | `callbackFingerprint` unique index |
| Bills | `residentId`, `status`, `createdAt`, `billingMonth`, `dueDate` |
| Meter readings | `meterId`, `billingMonth`, `createdAt` |
| Report joins | Foreign keys for resident, meter, and house relations |

This audit did not apply schema changes or production migrations. Index decisions should be based on actual `EXPLAIN (ANALYZE, BUFFERS)` output against a safe environment or carefully sampled production queries.

## 8. Validation performed

### Build results

| Check | Result | Notes |
|---|---|---|
| Backend `pnpm run build` | **Passed** | Prisma Client generated successfully and TypeScript compilation completed; Node 22 emitted an engine warning because the package requests Node 20.x |
| Frontend `pnpm run build` | **Blocked, not a source compilation failure** | The project’s build wrapper attempted `pnpm install`, which stopped at `ERR_PNPM_IGNORED_BUILDS` for dependency build scripts (`sharp`, Firebase utilities, protobufjs, and `unrs-resolver`) before the Next build could run |
| Backend native `pnpm test` | **No general test script** | The package defines named focused test scripts rather than a generic `test` script |

### Focused tests

All defined focused backend integrity tests passed in the local environment:

| Test script | Passed |
|---|---:|
| `test:tuma` | 22 |
| `test:security` | 25 |
| `test:billing` | 6 |
| `test:phase4` | 9 |
| `test:profile-picture` | 5 |
| `test:session-inactivity` | 5 |
| **Total** | **72** |

The test run created only a local `backend/logs/` directory, which was removed after validation. No source changes were made.

## 9. Recommended implementation order

### Phase A: stop avoidable `SELECT 1` volume

Create separate liveness and readiness semantics. Keep a controlled readiness endpoint for Railway and external monitoring, but make browser health checks less frequent or event-driven. Confirm the caller distribution in Railway logs before changing deployment configuration.

### Phase B: eliminate N+1 list/report queries

Start with `search.service.ts`, `resident.service.ts`, and `report.service.ts` because they have the clearest linear query amplification. Use relation selects first. Where relation shape is not convenient, use batched `findMany` calls with unique IDs and in-memory maps. Add pagination to unbounded report methods before optimizing their joins.

### Phase C: reduce auth-session write amplification

Preserve the existing 24-hour inactivity policy but conditionally update `lastActivityAt` rather than writing it on every request. Add focused tests around concurrent requests, inactivity boundaries, revoked sessions, and refresh-token rotation before deployment.

### Phase D: replace notification polling fallback

Use existing Socket.IO events to refresh notification state. Keep a low-frequency, visibility-aware fallback for missed events. Ensure resident and admin counts remain backend-authoritative and user-scoped.

### Phase E: optimize dashboard aggregates

Replace the six sequential monthly revenue aggregates with one grouped query. Consider short-lived caching for admin statistics if the dashboard is opened frequently, provided invalidation is tied to payment/bill events.

## 10. Explicit non-findings and protected behavior

The audit found no evidence that the shared singleton should be replaced. It also found no basis for removing payment idempotency records, row locks, balance checks, session revocation, or account-status checks. Those queries support security and financial integrity and should not be traded away for lower compute usage.

No production migration, `db push`, destructive SQL, schema modification, application code modification, or Git push was performed as part of this audit.

## References

The following repository files are the primary evidence sources for this audit:

1. [Shared Prisma singleton](backend/src/config/prisma.ts)
2. [Public health endpoints](backend/src/server.ts)
3. [Frontend health-check provider](frontend/src/components/providers/health-check-provider.tsx)
4. [Resident dashboard polling](frontend/src/app/dashboard/layout.tsx)
5. [Admin dashboard polling](frontend/src/app/admin/layout.tsx)
6. [Authentication middleware](backend/src/middleware/auth.ts)
7. [Authentication service](backend/src/services/auth.service.ts)
8. [Resident service](backend/src/services/resident.service.ts)
9. [Search service](backend/src/services/search.service.ts)
10. [Reporting service](backend/src/services/report.service.ts)
11. [Resident approval service](backend/src/services/resident-approval.service.ts)
12. [Payment engine](backend/src/services/payment-engine.service.ts)
13. [Notification service](backend/src/services/notification.service.ts)
14. [Prisma schema](backend/prisma/schema.prisma)
15. [Backend package scripts](backend/package.json)
