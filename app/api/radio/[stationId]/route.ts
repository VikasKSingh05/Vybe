import { NextRequest, NextResponse } from "next/server";
import "@/lib/radio/store";
import { isRadioStationId } from "@/lib/radio/config";
import { getRadioStore } from "@/lib/radio/store";
import { getStationDefinition } from "@/lib/radio/engine";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ stationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { stationId: rawId } = await context.params;
  if (!isRadioStationId(rawId)) {
    return NextResponse.json({ error: "Unknown station" }, { status: 404 });
  }

  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`radio:get:${ip}`, {
    maxTokens: 60,
    refillRate: 2,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const store = getRadioStore();
    const wire = await store.reconcile(rawId);
    const meta = getStationDefinition(rawId);
    return NextResponse.json({
      ...wire,
      name: meta.name,
      description: meta.description,
    });
  } catch (error) {
    console.error(`[API /api/radio/${rawId}]`, error);
    return NextResponse.json({ error: "Failed to load station" }, { status: 500 });
  }
}
