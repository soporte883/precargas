import bcrypt from 'bcryptjs';
import { sql } from '../lib/db.js';
import { verifyToken, parseCookies, COOKIE_NAME } from '../lib/auth.js';
import { ensureUsersSchema, normalizeRole } from '../lib/users.js';

async function getSession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

function forbidden(res) {
  return res.status(403).json({ error: 'Solo un administrador puede hacer esto' });
}

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'No autenticado' });
  if (session.role !== 'admin') return forbidden(res);

  await ensureUsersSchema();

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, username, role, is_active, created_at
        FROM users
        ORDER BY username ASC
      `;
      return res.status(200).json({ users: rows });
    }

    if (req.method === 'POST') {
      const { username, password, role, isActive } = req.body || {};
      const user = String(username || '').trim().toLowerCase();
      const pass = String(password || '');
      if (!user) return res.status(400).json({ error: 'El usuario es obligatorio' });
      if (pass.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

      const roleNorm = normalizeRole(role);
      const active = isActive === false ? false : true;
      const passwordHash = await bcrypt.hash(pass, 10);

      await sql`
        INSERT INTO users (username, password_hash, role, is_active)
        VALUES (${user}, ${passwordHash}, ${roleNorm}, ${active})
        ON CONFLICT (username)
        DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active
      `;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PATCH') {
      const { userId, role, isActive } = req.body || {};
      const id = Number(userId);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'userId inválido' });

      const existingRows = await sql`SELECT id, username, role, is_active FROM users WHERE id = ${id} LIMIT 1`;
      const existing = existingRows[0];
      if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

      const nextRole = role === undefined ? existing.role : normalizeRole(role);
      const nextActive = isActive === undefined ? existing.is_active : Boolean(isActive);

      if (existing.username === session.username && (nextRole !== 'admin' || nextActive === false)) {
        return res.status(400).json({ error: 'No puedes quitarte permisos admin ni desactivarte a ti mismo' });
      }

      await sql`
        UPDATE users
        SET role = ${nextRole}, is_active = ${nextActive}
        WHERE id = ${id}
      `;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Metodo no permitido' });
  } catch (err) {
    console.error('Error en admin-users:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
