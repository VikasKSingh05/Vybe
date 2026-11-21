import { NextRequest, NextResponse } from "next/server";
import "@/lib/radio/store";
import { isRadioStationId } from "@/lib/radio/config";
import { getRadioStore } from "@/lib/radio/store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ stationId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { stationId: rawId } = await context.params;
  if (!isRadioStationId(rawId)) {
    return NextResponse.json({ error: "Unknown station" }, { status: 404 });
  }

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
    const current = await store.getWire(rawId);
    if (refId && current.current?.refId !== refId) {
      return NextResponse.json(current);
    }
    const wire = await store.advance(rawId, "complete", expectedVersion);
    return NextResponse.json(wire);
  } catch (error) {
    console.error(`[API /api/radio/${rawId}/complete]`, error);
    return NextResponse.json({ error: "Advance failed" }, { status: 500 });
  }
}
