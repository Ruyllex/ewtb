
import { db } from "./src/db";
import { channels, users } from "./src/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkDb() {
  console.log("Checking DB...");
  try {
    const allUsers = await db.select().from(users);
    console.log(`Total Users: ${allUsers.length}`);
    allUsers.forEach(u => console.log(`- User: ${u.id} (${u.name}) pk: ${u.username}`));

    const allChannels = await db.select().from(channels);
    console.log(`Total Channels: ${allChannels.length}`);
    allChannels.forEach(c => console.log(`- Channel: ${c.id} (User: ${c.userId}) name: ${c.name}`));

    const joined = await db
        .select()
        .from(channels)
        .innerJoin(users, eq(channels.userId, users.id));
    
    console.log(`Joined Channels Count: ${joined.length}`);
  } catch (err) {
    console.error("Error querying DB:", err);
  }
  process.exit(0);
}

checkDb();
