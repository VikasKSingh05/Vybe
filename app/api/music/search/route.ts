import { NextRequest, NextResponse } from "next/server";
import { searchJioSaavnSongs } from "@/lib/music/jiosaavn";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`music:search:${ip}`, {
    maxTokens: 20,
    refillRate: 1 / 3,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const query = request.nextUrl.searchParams.get("query")?.trim() || "";
    if (!query) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }
    if (query.length > 200) {
      return NextResponse.json({ error: "Query too long" }, { status: 400 });
    }

    const songs = await searchJioSaavnSongs(query);
    return NextResponse.json({ songs });
  } catch (error) {
    console.error("[API /api/music/search] Error:", error);
    return NextResponse.json(
      { error: "Internal server error while searching" },
      { status: 500 }
    );
  }
}
