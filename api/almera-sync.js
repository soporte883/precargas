import crypto from 'node:crypto';
import { sql } from '../lib/db.js';
import { verifyToken, parseCookies, COOKIE_NAME } from '../lib/auth.js';

function normalizeCell(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function buildRowObject(headers, row) {
  const out = {};
  for (let i = 0; i < headers.length; i++) {
    const key = String(headers[i] ?? `columna_${i + 1}`).trim() || `columna_${i + 1}`;
    out[key] = row[i] ?? '';
  }
  return out;
}

function getLikelyName(rowObj) {
  const preferred = ['nombre completo', 'nombre', 'nombres', 'estudiante', 'nino', 'niño'];
  const entries = Object.entries(rowObj);

  for (const wanted of preferred) {
    const found = entries.find(([key]) => key.trim().toLowerCase() === wanted);
    if (found && String(found[1] ?? '').trim()) return String(found[1]).trim();
  }

  const fallback = entries.find(([, value]) => String(value ?? '').trim());
  return fallback ? String(fallback[1]).trim() : '';
}

async function getAuthenticatedUser(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const session = await getAuthenticatedUser(req);
  if (!session) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const { headers, rows, source } = req.body || {};

    if (!Array.isArray(headers) || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Payload invalido: se esperan headers y rows' });
    }
    if (!rows.length) {
      return res.status(400).json({ error: 'No hay filas nuevas para guardar' });
    }

    await sql`
      CREATE TABLE IF NOT EXISTS almera_ninos (
        id BIGSERIAL PRIMARY KEY,
        fingerprint TEXT UNIQUE NOT NULL,
        full_name TEXT,
        payload JSONB NOT NULL,
        source TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    let inserted = 0;
    let duplicates = 0;

    for (const row of rows) {
      if (!Array.isArray(row)) continue;

      const normalized = row.map(normalizeCell).join('|');
      const fingerprint = crypto.createHash('sha256').update(normalized).digest('hex');
      const rowObj = buildRowObject(headers, row);
      const fullName = getLikelyName(rowObj);
      const payload = JSON.stringify(rowObj);
      const sourceText = String(source || 'archivo');
      const createdBy = String(session.username || 'usuario');

      const result = await sql`
        INSERT INTO almera_ninos (fingerprint, full_name, payload, source, created_by)
        VALUES (${fingerprint}, ${fullName}, ${payload}::jsonb, ${sourceText}, ${createdBy})
        ON CONFLICT (fingerprint) DO NOTHING
        RETURNING id
      `;

      if (result.length) inserted += 1;
      else duplicates += 1;
    }

    return res.status(200).json({
      ok: true,
      inserted,
      duplicates,
      total: rows.length,
      table: 'almera_ninos',
    });
  } catch (err) {
    console.error('Error al sincronizar ninos:', err);
    return res.status(500).json({ error: 'Error interno al guardar en base de datos' });
  }
}
