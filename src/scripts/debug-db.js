const { drizzle } = require("drizzle-orm/neon-http");
const { neon } = require("@neondatabase/serverless");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function main() {
    console.log("Checking columns in users table...");
    try {
        const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY column_name;
    `;
        console.log("COLUMNS_LIST:", result.map(r => r.column_name).join(", "));

        console.log("Running failing query...");
        const clerkId = "user_35kWbWCG3CoIpC6OGn6pXedRv6g";
        const user = await sql`
      select "id", "clerk_id", "name", "username", "image_url", "paypal_account_id", "paypal_account_status", "can_monetize", "date_of_birth", "is_admin", "stars_balance", "created_at", "updated_at" 
      from "users" 
      where "users"."clerk_id" = ${clerkId} 
      limit 1
    `;
        console.log("User found:", user);

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
