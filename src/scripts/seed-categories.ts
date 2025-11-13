//TODO: Create a scripot to seed the categories

// Cargar variables de entorno ANTES de importar db
import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { categories } from "@/db/schema";

// Cargar .env.local de forma síncrona
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

// Verificar que DATABASE_URL esté definida
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida en .env.local");
  process.exit(1);
}

// Crear conexión directamente para el script
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const categoryNames = [
  "Cars and Vehicles",
  "Comedy",
  "Education",
  "Gaming",
  "Entertainment",
  "Film and Animation",
  "How-to and Style",
  "Music",
  "News and Politics",
  "People and Blogs",
  "Pets and Animals",
  "Science and Technology",
  "Sports",
  "Travel and Events",
];

async function main() {
  console.log("Seeding categories...");
  try {
    const values = categoryNames.map((name) => ({ name, description: `Videos related to ${name.toLowerCase()}` }));
    await db.insert(categories).values(values);
    console.log("Categories seeded successfully.");
  } catch (error) {
    console.error("Error seeding categories:", error);
    process.exit(1);
  }
}

main();