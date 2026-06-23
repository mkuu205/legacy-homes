# Legacy Homes — Water Billing System

A full-stack water billing management platform for residential estates. Built with **Next.js 14**, **Express.js**, **Prisma ORM**, and **MySQL/TiDB**.

---

## Project Structure

```
legacy-homes/
├── backend/                  # Express.js API server
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── src/
│       ├── config/           # Prisma client
│       ├── controllers/      # Route handlers
│       ├── middleware/       # Auth, error handler, notFound
│       ├── routes/           # Express routers
│       ├── services/         # Business logic
│       └── utils/            # Email, JWT, Cloudinary, logger
├── frontend/                 # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── admin/        # Admin portal pages
│       │   └── dashboard/    # Resident portal pages
│       ├── components/       # Shared UI components
│       ├── lib/              # API client (Axios)
│       └── store/            # Zustand auth store
├── .env.example              # Environment variable template
├── package.json              # Root workspace scripts
└── README.md
```

---

## Features

### Admin Portal
- **Dashboard** — Live stats: total residents, active meters, revenue, overdue bills
- **Residents** — Full CRUD: add, edit, suspend/activate, delete, reset password, CSV export
- **Meters** — Register meters, record readings (with photo), delete meters, CSV export
- **Billing** — Generate monthly bills, force-regenerate (deletes existing unpaid first), bulk delete, delete all unpaid, mark overdue, CSV export
- **Payments** — View all payments with search/status filters, bulk delete, retry verification, CSV export
- **Notifications** — Broadcast to all residents or overdue-only; sent history with delete-all
- **Reports** — Revenue, consumption, and collection analytics
- **Audit Logs** — Full action history
- **Settings** — System-wide configuration

### Resident Portal
- **Dashboard** — Current bill, recent payments, unread notifications, consumption history
- **Billing** — View bills, download invoice (PDF) for unpaid bills, download receipt (PDF) for paid bills
- **Payments** — M-Pesa STK push, payment history
- **Notifications** — In-app notifications with mark-read/unread/delete
- **Profile** — Update profile, upload photo, change password, delete account

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, TailwindCSS, TanStack Query |
| Backend | Node.js, Express.js, TypeScript |
| ORM | Prisma |
| Database | MySQL / TiDB |
| Auth | JWT (access + refresh tokens), bcrypt |
| File Storage | Cloudinary |
| Payments | M-Pesa (PayHero / Daraja) |
| Email | Nodemailer / SendGrid |
| SMS | TalkSasa / Africa's Talking |
| PDF | PDFKit |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL or TiDB database
- Cloudinary account
- M-Pesa API credentials (optional for development)

### 1. Clone & Install

```bash
git clone https://github.com/mkuu205/legacy-homes.git
cd legacy-homes

# Install root workspace dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your database URL, JWT secrets, Cloudinary credentials, and payment API keys.

### 3. Database Setup

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 4. Run Development Servers

```bash
# From root — runs both backend and frontend concurrently
npm run dev

# Or individually:
cd backend && npm run dev      # Backend on :5000
cd frontend && npm run dev     # Frontend on :3000
```

### 5. Build for Production

```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm start
```

---

## API Overview

All endpoints are prefixed with `/api`.

| Prefix | Description |
|---|---|
| `/api/auth` | Register, login, OTP, refresh token, delete account |
| `/api/residents` | Resident CRUD, status, password reset, CSV export |
| `/api/meters` | Meter CRUD, readings, CSV export |
| `/api/billing` | Bill generation, invoice/receipt PDF, CSV export |
| `/api/payments` | M-Pesa initiation, payment history, bulk delete |
| `/api/notifications` | Broadcast, resident notifications, mark read/unread |
| `/api/reports` | Dashboard stats, revenue, consumption analytics |
| `/api/support` | Support tickets and replies |
| `/api/admin` | Admin-specific utilities |

---

## Key Fixes & Improvements (v2)

### Billing Engine
- Force-regenerate now **deletes existing unpaid bills** before creating new ones, preventing duplicates
- Duplicate meter reading detection returns a clear, actionable error message

### Invoice & Receipt PDFs
- Redesigned with professional A4 two-column layout, proper table borders, and visual hierarchy
- Resident billing page correctly downloads **invoice** for unpaid bills and **receipt** for paid bills

### Meter Management
- Meter table now displays full resident info (name, account number, phone, email)
- Delete meter endpoint added with guard: blocks deletion when unpaid/overdue bills exist
- Meters CSV export added

### Resident Management
- Admin can create residents directly (POST `/residents`) without the approval flow
- Residents CSV export added with Export CSV button in the admin UI
- Delete resident wrapped in a **database transaction** for full atomicity

### Notifications
- Admin bell badge now shows the real count of unread resident notifications (was hardcoded 0)
- `markAsUnread` bug fixed (was setting status to `READ` instead of `PENDING`)
- `/notifications/all` alias added for admin layout polling

### Payments
- `getAllPayments` now supports `search`, `status`, and `residentId` filters
- `getResidentPayments` now supports `billId` filter for receipt lookup
- Payment CSV export respects active filters

### Database Integrity
- `deleteAccount` (self-service) wrapped in a **Prisma transaction** with explicit cascade order
- `deleteResident` (admin) wrapped in a **Prisma transaction** with explicit cascade order
- Both handle the missing schema-level cascades on `Bill`, `Payment`, `Ticket`, and `AuditLog`

### Resident Status Notifications
- Fixed invalid write to `UserNotification` model (was writing `title`/`message`/`type` fields that don't exist on that table)
- Now correctly creates a `Notification` record with a linked `UserNotification` record

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```env
DATABASE_URL=mysql://user:password@host:port/dbname
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PAYHERO_API_KEY=...
PAYHERO_CHANNEL_ID=...
EMAIL_HOST=...
EMAIL_USER=...
EMAIL_PASS=...
```

---

## License

Proprietary — Legacy Homes Estate Management.
