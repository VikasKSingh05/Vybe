import { NextRequest, NextResponse } from "next/server";
import "@/lib/radio/store";
import { getRadioStore } from "@/lib/radio/store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`radio:complete:${ip}`, {
    maxTokens: 20,
    refillRate: 0.5,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  let refId: string | undefined;
  let expectedVersion: number | undefined;
  try {
    const body = (await request.json()) as { refId?: string; version?: number };
    refId = body.refId;
    if (typeof body.version === "number") expectedVersion = body.version;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const store = getRadioStore();
    const current = await store.getWire();
    // A late "ended" event for a track that already advanced is a no-op.
    if (refId && current.current?.refId !== refId) {
      return NextResponse.json(current);
    }
    const wire = await store.advance("complete", expectedVersion);
    return NextResponse.json(wire);
  } catch (error) {
    console.error("[API /api/radio/complete]", error);
    return NextResponse.json({ error: "Advance failed" }, { status: 500 });
  }
}
