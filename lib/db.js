import { neon } from '@neondatabase/serverless';

// Conexión perezosa: se crea en el primer uso, no al importar el módulo.
// Así funciona tanto en Vercel (variables ya presentes) como en local
// (donde dotenv carga las variables antes de la primera consulta).
let client;

function getClient() {
  if (!client) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Falta la variable de entorno DATABASE_URL (o POSTGRES_URL)');
    }
    client = neon(connectionString);
  }
  return client;
}

// Wrapper con la misma firma de tagged template que neon: sql`SELECT ...`
export function sql(strings, ...values) {
  return getClient()(strings, ...values);
}
