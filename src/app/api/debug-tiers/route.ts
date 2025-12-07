import { db } from "@/db";
import { membershipTiers } from "@/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tiers = await db.select().from(membershipTiers);
    const dbUrl = process.env.DATABASE_URL || "NOT_SET";
    return NextResponse.json({ 
      count: tiers.length, 
      tiers,
      dbUrlPrefix: dbUrl.substring(0, 15) + "..." 
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
