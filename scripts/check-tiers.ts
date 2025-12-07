import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking membership tiers...");
  
  const { db } = await import("../src/db");
  const { membershipTiers } = await import("../src/db/schema");

  const count = await db.select({ count: sql<number>`count(*)` }).from(membershipTiers);
  console.log("Tier count:", count[0].count);
  
  const tiers = await db.select().from(membershipTiers);
  console.log("Tiers:", JSON.stringify(tiers, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
