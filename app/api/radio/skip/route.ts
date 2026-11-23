import { NextRequest, NextResponse } from "next/server";
import "@/lib/radio/store";
import { getRadioStore } from "@/lib/radio/store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`radio:skip:${ip}`, {
    maxTokens: 8,
    refillRate: 0.2,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many skip requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  let expectedVersion: number | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as { version?: number };
    if (typeof body.version === "number") expectedVersion = body.version;
  } catch {
    // optional body
  }

  try {
    const wire = await getRadioStore().advance("skip", expectedVersion);
    return NextResponse.json(wire);
  } catch (error) {
    console.error("[API /api/radio/skip]", error);
    return NextResponse.json({ error: "Skip failed" }, { status: 500 });
  }
}
