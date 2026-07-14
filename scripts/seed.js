/**
 * Script para crear la tabla de usuarios y agregar/actualizar usuarios.
 *
 * Uso:
 *   1. Descarga las variables de entorno de Vercel:  vercel env pull .env
 *      (o crea un .env con POSTGRES_URL y JWT_SECRET)
 *   2. Edita la lista USERS de abajo con tus usuarios y contraseñas.
 *   3. Ejecuta:  npm run seed
 *
 * Las contraseñas se guardan siempre cifradas (bcrypt). Nunca se almacenan en texto plano.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql } from '../lib/db.js';

// ⬇️  EDITA AQUÍ tus usuarios. Cambia las contraseñas antes de ejecutar.
const USERS = [
  { username: 'admin', password: 'CambiaEstaClave123' },
  // { username: 'maria', password: 'OtraClaveSegura456' },
];

async function main() {
  console.log('Creando tabla "users" si no existe...');
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  for (const user of USERS) {
    const username = user.username.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(user.password, 10);
    await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${username}, ${passwordHash})
      ON CONFLICT (username)
      DO UPDATE SET password_hash = EXCLUDED.password_hash
    `;
    console.log(`✔ Usuario listo: ${username}`);
  }

  console.log('\nListo. Usuarios creados/actualizados correctamente.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error al ejecutar el seed:', err);
  process.exit(1);
});
