/**
 * Script interactivo para crear la tabla de usuarios y agregar/actualizar usuarios.
 *
 * Uso:
 *   1. Asegúrate de tener las variables de entorno (Neon) en .env.local
 *      (se descargan solas con `vercel env pull .env.local` o al conectar la base).
 *   2. Ejecuta:  npm run seed
 *   3. Escribe el usuario y la contraseña cuando se te pida. La contraseña
 *      no se muestra en pantalla y se guarda cifrada (bcrypt).
 *
 * Así las contraseñas nunca quedan escritas en el código ni se suben a GitHub.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // respaldo: también carga .env si existe

import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { sql } from '../lib/db.js';

function question(query, { muted = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = function (str) {
      if (muted && !str.includes(query)) return; // oculta lo que se escribe
      rl.output.write(str);
    };
    rl.question(query, (value) => {
      rl.close();
      if (muted) process.stdout.write('\n');
      resolve(value);
    });
  });
}

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
  console.log('Tabla lista.\n');

  let seguir = true;
  while (seguir) {
    const usernameRaw = await question('Usuario: ');
    const username = usernameRaw.trim().toLowerCase();
    if (!username) {
      console.log('El usuario no puede estar vacío.\n');
      continue;
    }

    const password = await question('Contraseña: ', { muted: true });
    if (password.length < 6) {
      console.log('La contraseña debe tener al menos 6 caracteres.\n');
      continue;
    }
    const password2 = await question('Repite la contraseña: ', { muted: true });
    if (password !== password2) {
      console.log('Las contraseñas no coinciden. Intenta de nuevo.\n');
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${username}, ${passwordHash})
      ON CONFLICT (username)
      DO UPDATE SET password_hash = EXCLUDED.password_hash
    `;
    console.log(`✔ Usuario "${username}" creado/actualizado.\n`);

    const otro = (await question('¿Agregar otro usuario? (s/n): ')).trim().toLowerCase();
    seguir = otro === 's' || otro === 'si' || otro === 'y';
    console.log('');
  }

  console.log('Listo. Usuarios guardados correctamente.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error al ejecutar el seed:', err);
  process.exit(1);
});
