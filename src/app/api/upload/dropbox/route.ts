import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Return a simple JSON object to test if the route is reachable
  return NextResponse.json({ ok: true });
}
