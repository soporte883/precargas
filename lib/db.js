import { neon } from '@neondatabase/serverless';

// Neon (integración nativa de Vercel) expone DATABASE_URL.
// Se admite POSTGRES_URL por compatibilidad con configuraciones antiguas.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('Falta la variable de entorno DATABASE_URL (o POSTGRES_URL)');
}

export const sql = neon(connectionString);
