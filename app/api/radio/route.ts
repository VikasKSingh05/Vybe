import { NextRequest, NextResponse } from "next/server";
import "@/lib/radio/store";
import { getRadioStore } from "@/lib/radio/store";
import { emptyState, getStationDefinition, toWire } from "@/lib/radio/engine";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
    const wire = await getRadioStore().reconcile();
    const meta = getStationDefinition();
    return NextResponse.json({ ...wire, name: meta.name, description: meta.description });
  } catch (error) {
    // A broken store must not surface as a 500 to every listener. Serve a
    // truthful offline wire so the UI can show its retry state instead.
    console.error("[API /api/radio]", error);
    const now = Date.now();
    const offline = { ...emptyState(), status: "unavailable" as const, updatedAtMs: now };
    const meta = getStationDefinition();
    return NextResponse.json({
      ...toWire(offline, now),
      name: meta.name,
      description: meta.description,
    });
  }
}
