import { NextRequest, NextResponse } from "next/server";
import "@/lib/radio/store";
import { getRadioStore } from "@/lib/radio/store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DURATION_MS = 20 * 60_000;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`radio:duration:${ip}`, {
    maxTokens: 30,
    refillRate: 1,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  let refId = "";
  let durationMs = 0;
  let expectedVersion: number | undefined;
  try {
    const body = (await request.json()) as {
      refId?: string;
      durationMs?: number;
      version?: number;
    };
    refId = body.refId?.trim() ?? "";
    durationMs = typeof body.durationMs === "number" ? body.durationMs : 0;
    if (typeof body.version === "number") expectedVersion = body.version;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!refId || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_DURATION_MS) {
    return NextResponse.json({ error: "Invalid duration report" }, { status: 400 });
  }

  try {
    const wire = await getRadioStore().reportDuration(refId, durationMs, expectedVersion);
    return NextResponse.json(wire);
  } catch (error) {
    console.error("[API /api/radio/duration]", error);
    return NextResponse.json({ error: "Duration update failed" }, { status: 500 });
  }
}
