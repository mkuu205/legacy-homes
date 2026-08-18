# Legacy Homes Query Optimization Implementation Report

**Scope.** This report records the current implementation against `pasted_content_21.txt`. The application source was re-audited before the final refinement. No migration, schema, production-data, payment-state, or Prisma-singleton architecture changes were made. No changes were pushed to GitHub.

> Query counts below are **static estimates**, not measured production metrics. They describe the number of Prisma operations implied by the code for one request and a result set of size `N`; they are not Neon dashboard measurements.

## Executive summary

The confirmed unnecessary database activity has been addressed in the current working tree. Public browser health checks now use a database-free liveness endpoint, while database readiness remains available separately. Confirmed N+1 paths now use relation projections or bounded grouped reads. Resident and admin notification refreshes are event-driven and visibility-aware rather than fixed 30-second loops. Authentication still performs the security-sensitive user and refresh-token reads, but it no longer performs a session activity write for recently active sessions; stale activity is updated conditionally to preserve concurrent-request safety.

The remaining `SELECT 1` statements are intentional: the readiness endpoint, the payment-engine system-health method, and payment settlement row-lock queries are not ordinary browser health polling and were not removed. Password-reset token validation still scans `reset_*` settings because the current key/value design does not provide a safe direct lookup by token hash without a schema or behavior change. The admin search page already submits searches only on Enter or button activation, so no debounce change was necessary.

## Current architecture and discrepancies

| Requirement | Current result | Evidence |
|---|---|---|
| One production Prisma client | Preserved | `backend/src/config/prisma.ts` is the only runtime construction site. `backend/prisma/seed.ts` remains the acceptable seed exception. |
| Liveness without PostgreSQL | Implemented | `GET /health/live` and `GET /api/health/live` use process-only diagnostics. |
| Readiness with PostgreSQL | Preserved separately | `GET /health/ready` and `GET /api/health/ready` execute the intentional database probe and return `503` when unavailable. |
| Resident-list N+1 | Eliminated | Resident house relation is selected with the user query. |
| Global/advanced-search enrichment N+1 | Eliminated | Resident, bill, ticket, and meter relations are projected in their base queries. |
| Report enrichment N+1 | Eliminated in audited report paths | Billing, revenue, overdue, consumption, and dashboard payment paths use relation projections or bounded reads. |
| Approval-list N+1 | Eliminated | Pending and approved queue lists select house relations directly. Approval transactions were not changed. |
| Fixed 30-second notification polling | Removed | Layouts use initial authoritative fetch, socket invalidation, focus/visibility refresh, and a paused five-minute fallback. |
| Session write amplification | Reduced | Recent sessions skip the update query; stale sessions use a conditional `updateMany`. The 24-hour inactivity policy remains unchanged. |
| Resident dashboard follow-up house read | Removed | The dashboard user read includes the assigned-house relation. |
| Six sequential monthly aggregates | Collapsed | One bounded payment read is grouped in memory using the existing six-month windows. |
| Search on every keystroke | Not present | `frontend/src/app/admin/search/page.tsx` sends only from Enter/button handlers. |
| Password-reset settings scan | Intentionally retained | The token hash is stored inside `reset_<userId>` JSON; a direct lookup would require a data-model or reset-flow change. |
| Payment integrity queries | Preserved | Idempotency, callback audit, row locks, balance checks, ownership checks, and transaction boundaries remain. |

## Before/after optimization details

### 1. Health checks

**Files and functions.** `backend/src/server.ts` (`livenessHandler`, `readinessHandler`) and `frontend/src/lib/api.ts`, `frontend/src/components/providers/health-check-provider.tsx`.

**Old pattern.** Both public health paths executed `prisma.$queryRaw\`SELECT 1\`` on every request. The browser provider repeatedly called the database-backed endpoint.

**New pattern.** Liveness performs no Prisma operation. Readiness alone performs one `SELECT 1`. Browser availability checks use liveness, pause when the document is hidden, and retain visible outage detection. The legacy health paths remain lightweight liveness-compatible paths to avoid breaking existing callers; readiness callers should use `/health/ready`.

| Request condition | Old count | New count | Static reduction |
|---|---:|---:|---:|
| One browser liveness probe | 1 DB query | 0 | 100% |
| One explicit readiness probe | 1 DB query | 1 DB query | 0%; intentional |
| Hidden browser tab | Repeated DB probes | 0 while hidden | 100% during hidden period |

**Behavior and security.** Process outage visibility remains available, readiness detection was not removed, and no authentication or authorization behavior changed.

### 2. Resident list

**File/function.** `backend/src/services/resident.service.ts`, resident list method.

**Old pattern.** One paginated `user.findMany`, one `user.count`, followed by `N` individual house lookups.

**New pattern.** The assigned-house relation is projected in `user.findMany`; the count remains parallel and unchanged.

| Result set | Old count | New count | Static reduction |
|---|---:|---:|---:|
| `N` residents | `2 + N` | `2` | `N` queries; for 50 rows, 52 → 2 |

Pagination, ordering, filtering, authorization, and the returned house-number field are preserved.

### 3. Global and advanced search

**File/function.** `backend/src/services/search.service.ts`.

**Old pattern.** Global search used four category reads and then performed per-row relation enrichment for residents, bills, tickets, and meters. Advanced search similarly enriched individual rows.

**New pattern.** Each category query selects its required relations directly. Global search remains four parallel category queries. Advanced search remains one category query per selected type.

| Search mode | Old count | New count | Static reduction |
|---|---:|---:|---:|
| Global search with category result counts `R,B,T,M` | `4 + R + B + T + M` | `4` | `R+B+T+M` |
| Advanced search | `1 + N` for the selected category | `1` | `N` |

Search filters, category coverage, ordering, limits, and response field names remain unchanged. The admin frontend sends searches only on explicit Enter/button actions, so no debounce was required.

### 4. Reports and dashboard aggregates

**File/function.** `backend/src/services/report.service.ts`.

**Old pattern.** Report rows were fetched and enriched with per-row resident, meter, or house queries. The admin dashboard also issued six sequential monthly payment aggregate queries in addition to the other metrics.

**New pattern.** Report relations are projected in the base reads. The six monthly payment reads are replaced by one bounded payment read over the same six-month window, followed by in-memory grouping using the existing month boundaries, timezone handling, and successful-payment filter.

| Path | Old count | New count | Static reduction |
|---|---:|---:|---:|
| Row report with `N` enrichment rows | `base + N` | `base` | `N` |
| Six monthly payment aggregates | `6` sequential reads | `1` bounded read | `5` |
| Admin dashboard monthly component | `12 parallel + 6 sequential` | `12 parallel + 1 bounded` | `5` |

Totals, date ranges, status filters, Decimal-to-number conversion, and response shape were preserved. No speculative mega-query was introduced for the other twelve dashboard metrics.

### 5. Approval queue

**File/function.** `backend/src/services/resident-approval.service.ts`.

**Old pattern.** Pending and approved list rows performed individual house lookups.

**New pattern.** House data is selected through the user relation in the list query.

| Result set | Old count | New count | Static reduction |
|---|---:|---:|---:|
| `N` approval rows | `1 + N` list/enrichment reads | `1` list read | `N` |

Bulk approval transaction boundaries, state transitions, house assignment, authorization, validation, and email behavior were not changed.

### 6. Resident dashboard

**File/function.** `backend/src/services/resident.service.ts`.

**Old pattern.** The dashboard user read was followed by a separate house lookup even though the user relation already identifies the assigned house.

**New pattern.** The assigned-house relation is included in the user projection and the redundant follow-up read is removed.

| Dashboard component | Old count | New count | Static reduction |
|---|---:|---:|---:|
| User plus house portion | `1 + 1` | `1` | `1` |

Other dashboard reads, including bills, payments, unread notification authority, and meter-related data, were not merged into an unnecessarily large query.

### 7. Authentication session activity

**File/function.** `backend/src/middleware/auth.ts`, `backend/src/utils/session-policy.ts`.

**Old pattern.** Each authenticated request performed the security-sensitive user lookup, refresh-token lookup, and unconditional `lastActivityAt` update.

**New pattern.** The user and refresh-token reads remain. The existing `lastActivityAt` value is compared in memory against the configurable five-minute default interval. Recently active sessions perform no update query. Stale or null activity uses a conditional `updateMany` requiring the session to remain valid, unrevoked, unexpired, and still older than the cutoff. This prevents duplicate writes from concurrent requests while retaining the 24-hour inactivity check.

| Session state | Old count | New count | Static reduction |
|---|---:|---:|---:|
| Recently active | 3 queries | 2 queries | 1 write query |
| Stale/null activity | 3 queries | 3 queries | 0; required bounded refresh |
| Expired/revoked/inactive | Security reads then rejection | Same security reads and rejection | No security query removed |

The inactivity boundary, token/session binding, revocation, rotation, and expiration semantics remain unchanged.

### 8. Notification dashboards

**Files/functions.** `frontend/src/app/dashboard/layout.tsx`, `frontend/src/app/admin/layout.tsx`, `frontend/src/components/socket-provider.tsx`.

**Old pattern.** Resident and admin layouts each requested a one-item notification payload every 30 seconds, regardless of socket activity or document visibility.

**New pattern.** Each layout performs its initial authoritative fetch, refreshes on focus/visibility, responds to the shared socket-trigger event, and retains a five-minute fallback only while visible. Hidden tabs pause the fallback. Socket events trigger refetches; they do not become the unread-count authority.

| Visible 10-minute period with no socket event | Old count | New count | Static reduction |
|---|---:|---:|---:|
| One layout | 20 fallback polls | 2 fallback polls plus initial load | 18 recurring polls |
| Hidden tab | 20 recurring polls | 0 recurring polls | 100% while hidden |

The authenticated notification endpoints remain authoritative and no client-side unread counter was introduced.

## Remaining Neon database work

The following sources remain, by design:

| Source | Query | Classification | Why retained |
|---|---|---|---|
| `backend/src/server.ts` readiness handler | `SELECT 1` | Intentional readiness | Detects database availability for deployment/operations. |
| `backend/src/services/payment-engine.service.ts` system-health method | `SELECT 1` | Intentional explicit system check | Part of an operational payment-engine health report, not the browser liveness loop. Its caller should be monitored separately if it is later found to be high-frequency. |
| `backend/src/services/payment-engine.service.ts` settlement transaction | `FOR UPDATE` queries on payment and bill | Financial integrity | Protects settlement concurrency, balance checks, and idempotent callback processing. |
| `backend/src/services/auth.service.ts` reset flow | `systemSetting.findMany({ key.startsWith('reset_') })` | Lower-priority architectural issue | A direct lookup cannot be introduced safely with the existing JSON key/value format without changing the reset data model or storing a searchable token identifier. |
| Provider retry delays and UI timers | `setTimeout`/`setInterval` | Not necessarily database activity | They are provider backoff, toast/navigation timing, visibility-aware fallback polling, or connection recovery. Each remaining timer was inspected; the notification fallbacks are paused when hidden and lengthened to five minutes. |

Production Neon compute usage is **not claimed to be fixed** by this static review. Confirmation requires comparing Neon metrics before and after deployment, especially `SELECT 1` counts, readiness probe frequency, and request volume.

## Protected payment and security behavior

The payment engine still contains callback fingerprint/idempotency handling, callback audit updates, payment ownership and state checks, balance validation, row locks on the payment and bill, and transactional settlement. No payment query was removed merely because it was repetitive. Authentication still performs account-status checks, refresh-token lookup, session binding, inactivity enforcement, revocation checks, and token rotation. No security-sensitive lookup was removed.

## Validation

| Validation | Result |
|---|---:|
| Backend `pnpm run build` and Prisma generation | Passed |
| `test:session-inactivity` | 6 passed |
| `test:tuma` | 22 passed |
| `test:security` | 25 passed |
| `test:billing` | 6 passed |
| `test:phase4` | 9 passed |
| `test:profile-picture` | 5 passed |
| Direct `two-factor-auth.test.ts` execution | 5 passed |
| Frontend TypeScript compiler (`tsc --noEmit`) | Passed |
| Prisma-client inventory | One runtime client plus seed exception |
| Forbidden migration/destructive-operation diff scan | No matches |
| Generated artifact cleanup | Completed |

The repository has no package script named `test:two-factor-auth`; the test file exists and passed when invoked directly with Node’s test runner and `ts-node/register`. The standard frontend production build wrapper remains subject to the repository’s existing ignored-build-script policy for dependencies such as `sharp`; direct TypeScript compilation passed. No database migration, `db push`, reset, destructive SQL, or production-data operation was executed.

## Final answer to the required question

After these changes, the unnecessary Neon work remaining is limited to the password-reset settings scan and any future high-frequency callers of the explicit payment-engine system-health method, plus intentional readiness probes. The browser liveness path performs zero database queries. The confirmed N+1 paths now have static reductions of `N` relation lookups per resident/search/report/approval result set. The admin dashboard’s monthly aggregate component is reduced from six reads to one. Recently active authenticated requests lose one session-write query, while stale sessions retain one conditional refresh write. Notification fallback activity is reduced from one poll every 30 seconds to one every five minutes while visible and zero while hidden, with socket and focus refreshes retained.

These are static code-level estimates. They are not measured production results, and Neon compute usage must be verified from deployed metrics.
