import crypto from 'crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function encryptionKey(): Buffer {
  const configured = process.env.TOTP_ENCRYPTION_KEY?.trim();
  if (!configured) {
    throw new Error('TOTP_ENCRYPTION_KEY is required for administrator 2FA');
  }
  return crypto.createHash('sha256').update(configured, 'utf8').digest();
}

export function generateTotpSecret(): string {
  const bytes = crypto.randomBytes(20);
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    result += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  }
  return result;
}

function base32Decode(value: string): Buffer {
  const normalized = value.replace(/=+$/g, '').toUpperCase().replace(/\s+/g, '');
  let bits = '';
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid TOTP secret');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function verifyTotp(secret: string, input: string, now = Date.now()): boolean {
  const code = input.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  return [-1, 0, 1].some((delta) => {
    const expected = hotp(secret, counter + delta);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code));
  });
}

export function encryptTotpSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptTotpSecret(payload: string): string {
  const [ivPart, tagPart, encryptedPart] = payload.split('.');
  if (!ivPart || !tagPart || !encryptedPart) throw new Error('Invalid encrypted TOTP secret');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, 'base64url')), decipher.final()]).toString('utf8');
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => crypto.randomBytes(6).toString('hex').toUpperCase());
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.replace(/[-\s]/g, '').toUpperCase(), 'utf8').digest('hex');
}

export function consumeRecoveryCode(hashes: string[], input: string): string[] | null {
  const candidate = hashRecoveryCode(input);
  const index = hashes.findIndex((hash) => crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(candidate)));
  if (index < 0) return null;
  return hashes.filter((_, position) => position !== index);
}

export async function createTotpQrCode(secret: string, email: string): Promise<string> {
  const issuer = encodeURIComponent(process.env.TOTP_ISSUER?.trim() || 'Legacy Homes');
  const label = encodeURIComponent(`${process.env.TOTP_ISSUER?.trim() || 'Legacy Homes'}:${email}`);
  const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
  return QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', margin: 2, width: 256 });
}

export const TOTP_STEP_SECONDS = STEP_SECONDS;
export const TOTP_WINDOW = 1;
