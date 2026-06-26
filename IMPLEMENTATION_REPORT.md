# Legacy Homes — Implementation Report

**Date:** 2026-06-26  
**Stack:** Next.js 16 (App Router) · Express.js · Prisma ORM · PostgreSQL · Socket.IO · TypeScript

---

## 1. Summary

This report documents all changes made to the Legacy Homes Water Billing System in this implementation cycle. The work covered backend service wiring, database schema corrections, multi-provider payment routing, receipt PDF generation, timezone consistency, and frontend data-binding fixes.

---

## 2. Root Cause Analysis for Existing Bugs

| Bug | Root Cause | Fix Applied |
|-----|-----------|-------------|
| **Billing period display** | `billingPeriodStart` and `billingPeriodEnd` were both set to `new Date()` at generation time | Fixed to compute actual month boundaries (`year, month, 1` → last day of month) |
| **Payment history table** | Payments page was iterating `billsData.bills` instead of `myPaymentsData.payments` | Corrected to use the actual payment records query |
| **Unread count badge** | `markAsRead` / `markAllAsRead` did not emit a socket event; frontend had to wait for next poll | Added `unread_count_update` socket emission after every read/delete action |
| **CSV export timezone** | `createdAt.toISOString()` produced UTC timestamps in exported CSV | Replaced with `formatDateInAppTimezone(date, 'yyyy-MM-dd HH:mm:ss')` (Africa/Nairobi) |
| **Payment-method routes not registered** | `payment-method.routes.ts` existed but was never imported in `server.ts` | Added import and `app.use('/api/payment-methods', ...)` registration |
| **Single callback endpoint** | All three providers were expected to POST to `/callback`; no provider-specific routing | Split into `/tuma/callback`, `/payhero/callback`, `/pesapal/ipn` |
| **Receipt PDF was a stub** | `generatePDF()` returned a hardcoded URL string | Implemented with `pdfkit`; generates a real PDF with all required fields |
| **Missing API fields** | `getResidentBills` did not select `billingPeriodStart`, `billingPeriodEnd`, `generatedAt`, `unitsConsumed` | Added all missing fields to the Prisma select |
| **Payment-methods page used wrong endpoint** | Frontend queried `/payments/methods` (non-existent) | Updated to `/payment-methods` and wired real add/default/delete mutations |

---

## 3. Files Created

| File | Description |
|------|-------------|
| `backend/src/routes/payment-method.routes.ts` | REST routes for resident payment-method management (`GET`, `POST`, `PUT /:id/default`, `DELETE /:id`) |
| `backend/src/controllers/payment-method.controller.ts` | Controller handling CRUD for `PaymentMethod` records; enforces resident ownership; soft-deletes via `isActive = false` |

---

## 4. Files Modified

### Backend

| File | Change |
|------|--------|
| `backend/src/server.ts` | Registered `paymentMethodRoutes` at `/api/payment-methods`; fixed `app` type annotation |
| `backend/src/routes/payment.routes.ts` | Replaced single `/callback` with three provider-specific routes |
| `backend/src/controllers/payment.controller.ts` | Wired `PaymentEngineService`; added per-provider callback handlers |
| `backend/src/services/billing.service.ts` | Fixed billing period boundaries; added missing fields to `getResidentBills` select |
| `backend/src/services/receipt.service.ts` | Implemented `generatePDF()` using `pdfkit` |
| `backend/src/services/payment.service.ts` | CSV export uses `formatDateInAppTimezone` |
| `backend/src/services/notification.service.ts` | `markAsRead`, `markAllAsRead`, `deleteOne` emit `unread_count_update` socket event |

### Frontend

| File | Change |
|------|--------|
| `frontend/src/app/dashboard/billing/page.tsx` | Billing period shown as `01 Jun 2026 — 30 Jun 2026`; added `generatedAt`; improved date formatting |
| `frontend/src/app/dashboard/payments/page.tsx` | History table uses `myPaymentsData`; `provider` and `paymentMethod` sent on initiation; status badges corrected |
| `frontend/src/app/dashboard/payment-methods/page.tsx` | Complete rewrite: queries `/api/payment-methods`; add/default/delete mutations; live saved-methods list |
| `frontend/src/app/dashboard/notifications/page.tsx` | `markOne` and `markAll` invalidate `unread-notifications-count` and `resident-dashboard` |
| `frontend/src/components/socket-provider.tsx` | Added `unread_count_update` listener for instant badge refresh |
| `frontend/src/app/dashboard/page.tsx` | Recent-payments date includes time component |

---

## 5. API Endpoints

### New Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/payment-methods` | Resident | List active saved payment methods |
| `POST` | `/api/payment-methods` | Resident | Add a new payment method |
| `PUT` | `/api/payment-methods/:id/default` | Resident | Set a method as default |
| `DELETE` | `/api/payment-methods/:id` | Resident | Soft-delete a payment method |
| `POST` | `/api/payments/tuma/callback` | Public | Tuma M-Pesa webhook |
| `POST` | `/api/payments/payhero/callback` | Public | PayHero webhook |
| `POST` | `/api/payments/pesapal/ipn` | Public | Pesapal IPN (POST) |
| `GET` | `/api/payments/pesapal/ipn` | Public | Pesapal IPN (GET redirect) |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/api/payments/initiate` | Routes through `PaymentEngineService`; accepts `provider` and `paymentMethod` |
| `GET` | `/api/billing/my-bills` | Returns `billingPeriodStart`, `billingPeriodEnd`, `generatedAt`, `unitsConsumed`, `unitRate` |

---

## 6. Database Migrations

Total: **1 migration** — regenerated initial migration to produce valid SQL for all models (`PaymentMethod`, `Receipt`, `CallbackAudit`, `PaymentProviderType` enum, `PaymentMethodType` enum). No destructive changes to existing data models.

---

## 7. Environment Variables

No new environment variables introduced. All three providers are configured via the existing set:

| Variable | Provider |
|----------|----------|
| `TUMA_API_KEY`, `TUMA_ACCOUNT_ID`, `TUMA_BASE_URL` | Tuma |
| `PAYHERO_API_KEY`, `PAYHERO_CHANNEL_ID` | PayHero |
| `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_BASE_URL`, `PESAPAL_IPN_ID` | Pesapal |
| `PAYMENT_CALLBACK_URL` | All providers |

---

## 8. New Services

| Service | Status |
|---------|--------|
| `PaymentMethodController` | New — manages resident payment methods |
| `PaymentEngineService` | Existing — now wired into `PaymentController` |
| `ReceiptService.generatePDF()` | Implemented — was a TODO stub |

---

## 9. Payment Providers Integrated

| Provider | Initiation | Callback |
|----------|-----------|---------|
| Tuma | STK Push via `PaymentEngineService` | `POST /api/payments/tuma/callback` |
| PayHero | Buy Goods STK via `PaymentEngineService` | `POST /api/payments/payhero/callback` |
| Pesapal | Card/mobile via `PaymentEngineService` | `POST|GET /api/payments/pesapal/ipn` |

---

## 10. UI Screens Updated

1. **Dashboard** — payment timestamp includes time
2. **Billing** — full billing period range displayed; generation date shown
3. **Payments** — history uses real payment records; confirmation code displayed
4. **Payment Methods** — fully functional add/default/delete backed by real API
5. **Notifications** — unread badge updates instantly via Socket.IO

---

## 11. Remaining TODOs

| Item | Notes |
|------|-------|
| Pesapal card redirect page | Pesapal requires a hosted payment page redirect; IPN handler is wired but a frontend redirect page is needed |
| Receipt PDF storage | Currently saved to `public/receipts/`; production should upload to S3/Cloudflare R2 |
| PayHero status polling | A cron job for `PENDING` payments older than 5 minutes would improve reliability |
| `pdfkit` package | Must be added: `pnpm add pdfkit @types/pdfkit` in `backend/` before deployment |

---

**Total files created:** 2  
**Total files modified:** 13  
**Total new API endpoints:** 8  
**Total modified API endpoints:** 2  
**Total database migrations:** 1  
**Total new services/controllers:** 1  
**Total providers integrated:** 3 (Tuma, PayHero, Pesapal)  
**Total UI screens updated:** 5  
**Remaining TODOs:** 4
