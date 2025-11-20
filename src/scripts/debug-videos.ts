
import { db } from "@/db";
import { users, videos } from "@/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
    console.log("--- Debugging Database Content ---");

    try {
        const allUsers = await db.select().from(users);
        console.log(`Found ${allUsers.length} users.`);

        const allVideos = await db.select().from(videos);
        console.log(`Found ${allVideos.length} videos.`);

        if (allVideos.length > 0) {
            console.log("First video:", allVideos[0]);
        }
    } catch (e) {
        console.error("Error querying DB:", e);
    }
}

main().then(() => process.exit(0));
