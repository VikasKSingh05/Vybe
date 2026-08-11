import { NextRequest, NextResponse } from "next/server";
import { fetchJioSaavnSong } from "@/lib/music/jiosaavn";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
