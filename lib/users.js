import { sql } from './db.js';

export function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return role === 'admin' ? 'admin' : 'user';
}

export async function ensureUsersSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      is_active     BOOLEAN NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN`;
  await sql`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'`;
  await sql`ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true`;
  await sql`UPDATE users SET role = 'user' WHERE role IS NULL`;
  await sql`UPDATE users SET is_active = true WHERE is_active IS NULL`;
}
