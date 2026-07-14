import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'token';
const MAX_AGE_SECONDS = 8 * 60 * 60; // 8 horas

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Falta la variable de entorno JWT_SECRET');
  return new TextEncoder().encode(secret);
}

export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}

export function buildSessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function buildClearCookie() {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `${COOKIE_NAME}=; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=0`;
}

export function parseCookies(cookieHeader = '') {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
