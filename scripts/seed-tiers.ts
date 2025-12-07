import { config } from "dotenv";
import { start } from "repl";

// Load environment variables immediately
config({ path: ".env.local" });

async function main() {
  console.log("Seeding membership tiers...");

  // Dynamic import to ensure env vars are loaded before db connection
  const { db } = await import("../src/db");
  const { membershipTiers } = await import("../src/db/schema");

  const tiers = [
    { level: 1, name: "Fan", price: "2.99" },
    { level: 2, name: "Super Fan", price: "9.99" },
    { level: 3, name: "Mega Fan", price: "24.99" },
  ];

  for (const tier of tiers) {
    await db
      .insert(membershipTiers)
      .values({
        level: tier.level,
        name: tier.name,
        price: tier.price,
      })
      .onConflictDoNothing();
  }

  console.log("Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
