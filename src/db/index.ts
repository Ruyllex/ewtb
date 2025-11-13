import { drizzle } from "drizzle-orm/neon-http";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL no está definida. Por favor, crea un archivo .env.local en la raíz del proyecto con la variable DATABASE_URL.\n\n" +
    "Ejemplo:\n" +
    "DATABASE_URL=postgresql://usuario:password@host:puerto/database\n\n" +
    "Consulta el README.md para más información sobre las variables de entorno necesarias."
  );
}

export const db = drizzle(DATABASE_URL);
