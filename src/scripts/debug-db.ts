import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Testing connection...");
    try {
        const res = await db.execute(sql`SELECT 1`);
        console.log("Connection successful:", res);
    } catch (error) {
        console.error("Connection failed!");
        console.error(error);
    }
    process.exit(0);
}

main();
