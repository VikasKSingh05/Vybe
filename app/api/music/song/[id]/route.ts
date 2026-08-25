import { NextRequest, NextResponse } from "next/server";
import { fetchJioSaavnSong } from "@/lib/music/jiosaavn";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Headroom for cold starts on the upstream JioSaavn API.
export const maxDuration = 30;

const VALID_SONG_ID = /^[a-zA-Z0-9_-]{1,32}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!VALID_SONG_ID.test(id) && id !== "search") {
    return NextResponse.json({ error: "Invalid song ID" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`music:song:${ip}`, {
    maxTokens: 60,
    refillRate: 1,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || undefined;

    const song = await fetchJioSaavnSong(id, query);

    if (!song || !song.streamUrl) {
      return NextResponse.json(
        { error: `Song ${query ? `"${query}"` : `ID ${id}`} could not be resolved or has no playable stream` },
        { status: 404 }
      );
    }

    return NextResponse.json(song);
  } catch (error) {
    console.error("[API /api/music/song/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error while resolving song" },
      { status: 500 }
    );
  }
}
