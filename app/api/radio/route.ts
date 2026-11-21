import { NextRequest, NextResponse } from "next/server";
import "@/lib/radio/store";
import { getRadioStore } from "@/lib/radio/store";
import { getStationDefinition } from "@/lib/radio/engine";
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
    console.error("[API /api/radio]", error);
    return NextResponse.json({ error: "Failed to load VYBE LIVE" }, { status: 500 });
  }
}
