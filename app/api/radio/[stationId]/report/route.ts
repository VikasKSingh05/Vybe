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
  const { allowed, retryAfterMs } = rateLimit(`radio:report:${ip}`, {
    maxTokens: 15,
    refillRate: 0.3,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  let refId = "";
  let expectedVersion: number | undefined;
  try {
    const body = (await request.json()) as { refId?: string; version?: number };
    refId = body.refId?.trim() ?? "";
    if (typeof body.version === "number") expectedVersion = body.version;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!refId) {
    return NextResponse.json({ error: "refId required" }, { status: 400 });
  }

  try {
    const store = getRadioStore();
    const wire = await store.reportFailure(rawId, refId, expectedVersion);
    return NextResponse.json(wire);
  } catch (error) {
    console.error(`[API /api/radio/${rawId}/report]`, error);
    return NextResponse.json({ error: "Report failed" }, { status: 500 });
  }
}
