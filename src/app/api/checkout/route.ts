import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "Checkout no está disponible actualmente." },
    { status: 503 }
  );
}


