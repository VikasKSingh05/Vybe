import { NextRequest, NextResponse } from "next/server";
import "@/lib/radio/store";
import { getRadioStore } from "@/lib/radio/store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`radio:list:${ip}`, {
    maxTokens: 30,
    refillRate: 1,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const store = getRadioStore();
    const stations = await store.listSummaries();
    return NextResponse.json({ stations, serverNowMs: Date.now() });
  } catch (error) {
    console.error("[API /api/radio]", error);
    return NextResponse.json({ error: "Failed to load stations" }, { status: 500 });
  }
}
