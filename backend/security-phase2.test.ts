import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(__dirname, 'src');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const readRepo = (relative: string) => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');

const auth = read('services/auth.service.ts');
const middleware = read('middleware/auth.ts');
const server = read('server.ts');
const authRoutes = read('routes/auth.routes.ts');
const paymentRoutes = read('routes/payment.routes.ts');
const houseRoutes = read('routes/house.routes.ts');
const reconciliationRoutes = read('routes/payment-reconciliation.routes.ts');
const residentRoutes = read('routes/resident.routes.ts');
const supportRoutes = read('routes/support.routes.ts');
const billingController = read('controllers/billing.controller.ts');
const paymentController = read('controllers/payment.controller.ts');
const supportService = read('services/support.service.ts');
const seed = readRepo('backend/prisma/seed.ts');
const frontendApi = readRepo('frontend/src/lib/api.ts');
const frontendStore = readRepo('frontend/src/store/auth.store.ts');
const frontendSocket = readRepo('frontend/src/lib/socket.ts');

test('resident profile ownership is enforced by resident-scoped routes', () => {
  assert.match(residentRoutes, /router\.put\('\/profile', authenticate/);
  assert.doesNotMatch(residentRoutes, /router\.get\('\/profile\/:id'/);
});

test('resident bill lookup is scoped to the authenticated resident', () => {
  assert.match(billingController, /req\.user!\.role === 'SUPER_ADMIN' \? undefined : req\.user!\.userId/);
});

test('resident payment status checks ownership', () => {
  assert.match(paymentController, /checkPaymentStatus\(paymentId, req\.user!\.userId\)/);
});

test('resident notifications use authenticated identity in the service layer', () => {
  const notifications = read('services/notification.service.ts');
  assert.match(notifications, /userId/);
  assert.match(notifications, /findFirst\(\{[^}]*userId/s);
});

test('resident receipts are filtered by authenticated resident ID', () => {
  assert.match(billingController, /generateReceiptPDF\([\s\S]*req\.user!\.userId/);
});

test('Socket.IO rejects unauthenticated connections', () => {
  assert.match(server, /if \(!token\) return next\(new Error\('Authentication required'\)\)/);
});

test('Socket.IO private rooms require the authenticated user identity', () => {
  assert.match(server, /userId !== socket\.data\.userId/);
});

test('residents cannot join admin Socket.IO rooms', () => {
  assert.match(server, /if \(!socket\.data\.isAdmin[^\n]*startsWith\('admin_'\)/);
});

test('resident approval routes require SUPER_ADMIN', () => {
  assert.match(read('routes/resident-approval.routes.ts'), /router\.use\(authMiddleware, authorize\('SUPER_ADMIN'\)\)/);
});

test('house management routes require SUPER_ADMIN', () => {
  assert.match(houseRoutes, /router\.use\(authMiddleware, authorize\('SUPER_ADMIN'\)\)/);
});

test('payment reconciliation routes require SUPER_ADMIN', () => {
  assert.match(reconciliationRoutes, /router\.use\(authMiddleware, authorize\('SUPER_ADMIN'\)\)/);
});

test('payment deletion is administrator-only', () => {
  assert.match(paymentRoutes, /router\.delete\('\/:id', authenticate, authorize\('SUPER_ADMIN'\)/);
});

test('role authorization is loaded from the current database account', () => {
  assert.match(middleware, /select: \{ id: true, email: true, role: true, accountStatus: true \}/);
});

test('production CORS uses explicit configured origins and credentials', () => {
  assert.match(server, /const allowedOrigins = new Set\(configuredOrigins\)/);
  assert.match(server, /credentials: true/);
  assert.doesNotMatch(server, /origin:\s*['"]\*['"]/);
});

test('auth endpoints use stricter limits and refresh has a dedicated limiter', () => {
  assert.match(authRoutes, /skipSuccessfulRequests: true/);
  assert.match(authRoutes, /router\.post\('\/refresh-token', refreshLimiter/);
  assert.match(authRoutes, /AUTH_REFRESH_RATE_LIMIT_MAX/);
});

test('refresh tokens are not persisted in frontend storage', () => {
  assert.doesNotMatch(frontendStore, /(?:localStorage|sessionStorage)\.setItem\(\s*['"]refreshToken['"]/);
  assert.match(frontendApi, /withCredentials: true/);
});

test('Socket.IO client supplies an access token instead of a user-controlled room identity', () => {
  assert.match(frontendSocket, /auth:\s*\{\s*token:/s);
});

test('deleted and inactive accounts cannot log in or refresh', () => {
  assert.match(auth, /user\.accountStatus !== 'ACTIVE'/);
  assert.match(auth, /if \(!user \|\| user\.accountStatus !== 'ACTIVE'\)/);
});

test('password reset tokens are one-time and expired tokens are rejected', () => {
  assert.match(auth, /new Date\(\) < new Date\(data\.expiresAt\)/);
  assert.match(auth, /systemSetting\.delete/);
});

test('password changes revoke existing refresh sessions', () => {
  assert.match(read('services/resident.service.ts'), /refreshToken\.updateMany\(\{ where: \{ userId/);
});

test('profile uploads are authenticated and constrained by MIME, extension, and size', () => {
  assert.match(residentRoutes, /router\.post\(\s*'\/profile\/picture',\s*authenticate/);
  assert.match(residentRoutes, /ALLOWED_EXTENSIONS/);
  assert.match(residentRoutes, /fileSize: 5 \* 1024 \* 1024/);
});

test('support uploads are constrained by MIME, file count, and size', () => {
  assert.match(supportRoutes, /SUPPORT_MIME_TYPES/);
  assert.match(supportRoutes, /files: 5/);
  assert.match(supportRoutes, /fileSize: 10 \* 1024 \* 1024/);
});

test('support ticket service enforces resident ownership', () => {
  assert.match(supportService, /residentId/);
  assert.match(supportService, /ticket\.residentId !== data\.userId/);
});

test('seed setup requires explicit passwords and does not contain a predictable default password', () => {
  assert.match(seed, /SEED_ADMIN_PASSWORD/);
  assert.match(seed, /SEED_RESIDENT_PASSWORD/);
  assert.doesNotMatch(seed, /Admin@123|password123|admin123/i);
});

test('authorization and secret values are not logged by the hardened paths', () => {
  assert.doesNotMatch(server, /console\.log\([^\n]*(Authorization|Bearer|password|api[_-]?key|secret)/i);
  assert.doesNotMatch(auth, /logger\.(info|debug|warn|error)\([^\n]*(password|refreshToken|jwt)/i);
});
