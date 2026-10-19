import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error('Password must be at least 12 characters');
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, salt, expectedHex] = encoded.split('$');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export type TokenClaims = { sub: string; tenantId: string; role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT'; exp: number; iat: number; iss: 'zalo-center'; aud: 'zalo-center-api' };
export function issueToken(claims: Pick<TokenClaims, 'sub' | 'tenantId' | 'role'>, secret: string, ttlSeconds = 3600): string {
  const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ ...claims, iat: now, exp: now + ttlSeconds, iss: 'zalo-center', aud: 'zalo-center-api' });
  const unsigned = `${head}.${body}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}
export function verifyToken(token: string, secret: string): TokenClaims | null {
  try {
    const [head, body, sig] = token.split('.');
    if (!head || !body || !sig) return null;
    const header = JSON.parse(Buffer.from(head, 'base64url').toString()) as { alg?: string; typ?: string };
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const unsigned = `${head}.${body}`;
    const expected = createHmac('sha256', secret).update(unsigned).digest();
    const actual = Buffer.from(sig, 'base64url');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenClaims;
    const allowedRoles = ['OWNER', 'ADMIN', 'MANAGER', 'AGENT'];
    if (!claims.sub || !claims.tenantId || !allowedRoles.includes(claims.role) ||
        !Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000) ||
        claims.iss !== 'zalo-center' || claims.aud !== 'zalo-center-api') return null;
    return claims;
  } catch { return null; }
}
