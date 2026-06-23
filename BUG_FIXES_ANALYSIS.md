# Legacy Homes - Bug Fixes Analysis & Solutions

## Issues Identified and Root Causes

### 1. **Page Refresh Logs Out User (Issue #1)**
**Root Cause:** The auth store uses Zustand's `persist` middleware which stores data in localStorage. However, the `hydrated` flag is not properly managed, causing the store to reset before rehydration completes.

**Solution:** 
- Ensure proper hydration check in layouts before rendering
- Add a client-side auth check on app mount to restore session

---

### 2. **Logout Redirects to Login Instead of Home (Issue #2)**
**Root Cause:** Both admin and user layouts hardcode redirect to `/login` after logout.

**Solution:**
- Change logout redirect to `/` (home page) instead of `/login`

---

### 3. **Double Login Required (Issue #3)**
**Root Cause:** Multiple potential causes:
- Refresh token rotation on each refresh might invalidate the token before it's stored
- Session hydration timing issues
- API interceptor retry logic might be conflicting

**Solution:**
- Ensure refresh token is properly stored before making requests
- Add better error handling in API interceptor
- Verify token storage persistence

---

### 4. **Admin Dashboard Resident Action Buttons Not Working (Issue #4)**
**Root Cause:** Need to examine the residents page to identify missing event handlers or API calls.

**Solution:**
- Add proper onClick handlers
- Implement API calls for resident actions
- Add error handling and loading states

---

### 5. **CSV Export Not Working in Reports (Issue #5)**
**Root Cause:** Missing or broken CSV export functionality in reports page.

**Solution:**
- Implement CSV export using a library like `papaparse`
- Add proper data formatting
- Handle file download

---

### 6. **Ticket System Doesn't Show Replies (Issue #6)**
**Root Cause:** Replies might not be fetched or displayed in the ticket detail view.

**Solution:**
- Ensure API fetches ticket replies
- Display replies in chronological order
- Add reply form for users

---

### 7. **Cannot Download Invoice (Issue #7)**
**Root Cause:** Missing download functionality or broken API endpoint.

**Solution:**
- Implement invoice download button
- Generate PDF or fetch from backend
- Handle download errors

---

### 8. **Notification Count Mismatch (Issue #8)**
**Root Cause:** Unread count is cached but not updated when user reads notifications.

**Solution:**
- Fetch unread count on page load
- Update count when user opens notifications
- Mark notifications as read when viewed
- Show 0 when all are read

---

### 9. **Bill Not Sent to User Phone (Issue #9)**
**Root Cause:** SMS notification for bills not implemented or disabled.

**Solution:**
- Add SMS sending in billing service
- Use Twilio or similar SMS provider
- Send bill notification to user phone number

---

### 10. **Cannot Upload Profile Photo (Issue #10)**
**Root Cause:** Upload button not functional or missing API endpoint.

**Solution:**
- Implement file upload handler
- Add image preview
- Call backend upload endpoint
- Update user profile picture

---

### 11. **Session Isolation Issue - Admin/Resident Tab Conflict (Issue #11)**
**Root Cause:** **CRITICAL** - The app uses shared localStorage keys for all users. When you log in as admin in one tab, it overwrites the resident session in another tab because:
- Both tabs share the same localStorage
- Auth store keys are not isolated by browser tab/window
- No session/tab isolation mechanism exists

**Solution:**
- Use sessionStorage for tab-specific data
- Implement tab-aware session management
- Store session ID and validate on each request
- Add warning when session changes in another tab

---

### 12. **Welcome Notification Not Visible (Issue #12)**
**Root Cause:** Welcome notification might be hidden, not displayed, or has poor styling.

**Solution:**
- Make welcome notification more prominent
- Use toast notification or banner
- Add animation or highlight
- Ensure it's displayed on first login

---

## Implementation Priority

1. **CRITICAL**: Fix session isolation (Issue #11) - affects security
2. **HIGH**: Fix refresh logout (Issue #1) - affects user experience
3. **HIGH**: Fix double login (Issue #3) - affects user experience
4. **MEDIUM**: Fix other UI/functionality issues (2,4,5,6,7,8,9,10,12)

---

## Files to Modify

### Frontend
- `/frontend/src/store/auth.store.ts` - Add session isolation
- `/frontend/src/lib/api.ts` - Improve error handling
- `/frontend/src/app/admin/layout.tsx` - Fix logout redirect
- `/frontend/src/app/dashboard/layout.tsx` - Fix logout redirect
- `/frontend/src/app/dashboard/page.tsx` - Add welcome notification
- `/frontend/src/app/dashboard/profile/page.tsx` - Add profile photo upload
- `/frontend/src/app/dashboard/notifications/page.tsx` - Fix notification count
- `/frontend/src/app/dashboard/support/page.tsx` - Fix ticket replies display
- `/frontend/src/app/dashboard/billing/page.tsx` - Add invoice download
- `/frontend/src/app/admin/residents/page.tsx` - Fix action buttons
- `/frontend/src/app/admin/reports/page.tsx` - Add CSV export

### Backend
- `/backend/src/services/billing.service.ts` - Add SMS notification
- `/backend/src/controllers/resident.controller.ts` - Implement actions
- `/backend/src/controllers/report.controller.ts` - Add CSV export
- `/backend/src/controllers/support.controller.ts` - Ensure replies are included
- `/backend/src/controllers/payment.controller.ts` - Add invoice generation

