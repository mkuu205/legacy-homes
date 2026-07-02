# Firebase Configuration Fixes

## Issues Fixed

### 1. Missing Firebase Project Configuration
**Error**: `FirebaseError: Installations: Missing App configuration value: "projectId"`

**Root Cause**: The Firebase configuration in `frontend/src/lib/firebase.ts` was trying to initialize with environment variables that were not set or were undefined.

**Solution**:
- Added validation function `validateFirebaseConfig()` to check for required Firebase configuration fields
- Added graceful fallback when configuration is incomplete
- Firebase Messaging is now disabled with a warning instead of crashing the app
- All required environment variables are now documented in `.env.example`

### 2. Invalid Firebase Service Worker
**Error**: `Messaging: We are unable to register the default service worker...`

**Root Cause**: The `firebase-messaging-sw.js` file had a placeholder value `"YOUR_MESSAGING_SENDER_ID"` instead of actual configuration, and it was trying to initialize Firebase without proper validation.

**Solution**:
- Updated the service worker to validate Firebase configuration before initialization
- Added proper error handling and logging
- Service worker now gracefully disables background messaging if configuration is incomplete
- Added null-safety checks for notification properties

### 3. Missing Environment Variable Documentation
**Solution**:
- Created `.env.example` file with all required Firebase environment variables
- Added comments explaining where to find these values (Firebase Project Settings)
- Documented the `NEXT_PUBLIC_` prefix requirement for browser-accessible variables

### 4. Improved Error Handling in Login Flow
**Enhancement**:
- FCM token registration is now non-blocking
- Login succeeds even if Firebase Messaging is unavailable
- Better logging to help diagnose Firebase configuration issues
- Graceful degradation when push notifications are not available

## Environment Variables Required

To enable Firebase Cloud Messaging, set these environment variables in your `.env.local` file:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_value
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_value
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_value
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_value
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_value
NEXT_PUBLIC_FIREBASE_APP_ID=your_value
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_value
```

See `.env.example` for more details.

## How to Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Under **Your apps**, find your web app
5. Copy the configuration object
6. Map the values to the environment variables above

## Testing

1. If Firebase configuration is not set:
   - App will still work normally
   - Push notifications will be disabled
   - Console will show warnings about missing Firebase config

2. If Firebase configuration is properly set:
   - Push notifications will work
   - Service worker will register successfully
   - Users will be able to receive background messages

## Files Modified

- `frontend/src/lib/firebase.ts` - Added configuration validation and error handling
- `frontend/public/firebase-messaging-sw.js` - Added configuration validation and error handling
- `frontend/src/app/login/page.tsx` - Improved FCM error handling to be non-blocking
- `frontend/next.config.ts` - Added environment variable configuration
- `frontend/.env.example` - Created with all required variables documented

## Deployment Notes

When deploying to production (e.g., Vercel):
1. Set the environment variables in your deployment platform's settings
2. The build process will automatically inject these values
3. No code changes are needed for different environments
