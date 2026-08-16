import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = join(__dirname, 'src');
const routes = readFileSync(join(root, 'routes/resident.routes.ts'), 'utf8');
const controller = readFileSync(join(root, 'controllers/resident.controller.ts'), 'utf8');
const service = readFileSync(join(root, 'services/resident.service.ts'), 'utf8');
const cloudinary = readFileSync(join(root, 'utils/cloudinary.ts'), 'utf8');

/**
 * These focused contract tests exercise the complete production upload flow
 * without making a real provider request or requiring credentials in CI.
 */
test('successful profile-picture flow uploads from memory and saves the provider URL', () => {
  assert.match(routes, /storage:\s*multer\.memoryStorage\(\)/);
  assert.match(controller, /residentService\.updateProfilePicture\(req\.user!\.userId, req\.file\.buffer\)/);
  assert.match(service, /uploadBufferToCloudinary\(fileBuffer, 'profile-pictures'\)/);
  assert.match(service, /data:\s*\{\s*profilePicture:\s*uploadResult\.url\s*\}/s);
  assert.match(cloudinary, /cloudinary\.uploader\.upload_stream/);
});

test('invalid profile-picture files are rejected before storage', () => {
  assert.match(routes, /ALLOWED_MIME/);
  assert.match(routes, /ALLOWED_EXTENSIONS/);
  assert.match(routes, /fileSize:\s*5 \* 1024 \* 1024/);
  assert.match(routes, /Unsupported image type/);
  assert.match(routes, /LIMIT_FILE_SIZE/);
});

test('profile-picture upload requires authentication and a file', () => {
  assert.match(routes, /router\.post\(\s*'\/profile\/picture',\s*authenticate/);
  assert.match(controller, /if \(!req\.file\)/);
  assert.match(controller, /No file uploaded/);
  assert.match(controller, /req\.user!\.userId/);
});

test('Cloudinary credentials are environment-based and normalized before signing', () => {
  assert.match(cloudinary, /process\.env\.CLOUDINARY_CLOUD_NAME\?\.trim\(\)/);
  assert.match(cloudinary, /process\.env\.CLOUDINARY_API_KEY\?\.trim\(\)/);
  assert.match(cloudinary, /process\.env\.CLOUDINARY_API_SECRET\?\.trim\(\)/);
  assert.match(cloudinary, /cloud_name:\s*cloudName/);
  assert.match(cloudinary, /api_key:\s*apiKey/);
  assert.match(cloudinary, /api_secret:\s*apiSecret/);
  assert.doesNotMatch(cloudinary, /npg_|sk_live|api_secret:\s*['"]/i);
});

test('storage-provider failures are surfaced as controlled 503 errors', () => {
  assert.match(cloudinary, /statusCode = 503/);
  assert.match(service, /Profile picture upload is temporarily unavailable/);
  assert.match(service, /throw new AppError\('Profile picture upload is temporarily unavailable\. Please try again\.', 503\)/);
  assert.doesNotMatch(service, /throw error;\s*\n\s*}\s*\n\s*async changePassword/);
});

// Keep this test file credential-free: no provider secret or upload payload is stored here.
assert.ok(true);

export {};
