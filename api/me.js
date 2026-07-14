import { verifyToken, parseCookies, COOKIE_NAME } from '../lib/auth.js';

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const payload = await verifyToken(token);
    return res.status(200).json({ authenticated: true, username: payload.username, role: payload.role || 'user' });
  } catch {
    return res.status(401).json({ authenticated: false });
  }
}
