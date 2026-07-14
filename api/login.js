import bcrypt from 'bcryptjs';
import { sql } from '../lib/db.js';
import { signToken, buildSessionCookie } from '../lib/auth.js';
import { ensureUsersSchema } from '../lib/users.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    await ensureUsersSchema();
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const rows = await sql`
      SELECT id, username, password_hash, role, is_active
      FROM users
      WHERE username = ${String(username).trim().toLowerCase()}
      LIMIT 1
    `;

    const user = rows[0];
    // Comparación siempre, incluso sin usuario, para evitar filtrar cuentas por tiempo.
    const dummyHash = '$2a$10$W13J81zAXK6vAkfSZW1VoONk9tZtEa1s.G8pecWCsovPFOshZJ6ua';
    const hashToCompare = user ? user.password_hash : dummyHash;
    const valid = await bcrypt.compare(password, hashToCompare);

    if (!user || !valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Usuario inactivo. Contacta al administrador' });
    }

    const token = await signToken({ sub: user.id, username: user.username, role: user.role || 'user' });
    res.setHeader('Set-Cookie', buildSessionCookie(token));
    return res.status(200).json({ ok: true, username: user.username, role: user.role || 'user' });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
