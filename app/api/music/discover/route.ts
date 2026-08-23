import { NextRequest, NextResponse } from "next/server";
import { discoverRandomSongs } from "@/lib/music/discover";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`music:discover:${ip}`, {
    maxTokens: 10,
    refillRate: 1 / 2,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const countParam = request.nextUrl.searchParams.get("count");
    const count = Math.min(Math.max(Number(countParam) || 1, 1), 30);

    const excludeParam = request.nextUrl.searchParams.get("exclude") || "";
    const excludeIds = new Set(
      excludeParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );

    const songs = await discoverRandomSongs(count, excludeIds);
    return NextResponse.json({ songs });
  } catch (error) {
    console.error("[API /api/music/discover] Error:", error);
    return NextResponse.json(
      { error: "Internal server error while discovering songs" },
      { status: 500 },
    );
  }
}
