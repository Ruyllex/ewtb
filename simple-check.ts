
import { db } from "./src/db";
import { channels, users } from "./src/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function check() {
  try {
    const c = await db.select().from(channels);
    console.log("CHANNELS_COUNT:", c.length);
    const u = await db.select().from(users);
    console.log("USERS_COUNT:", u.length);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

check();
