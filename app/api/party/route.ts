import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/party/store";
import type { VibeId } from "@/data/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_VIBES = ["all", "phonk", "lofi", "bollywood", "indie", "chill"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { hostName?: string; vibeId?: string }
      | null;

    const hostName = typeof body?.hostName === "string" ? body.hostName.trim().slice(0, 24) : "";
    const vibeId = body?.vibeId ?? "all";

    if (!hostName) {
      return NextResponse.json({ error: "hostName is required" }, { status: 400 });
    }
    if (!VALID_VIBES.includes(vibeId)) {
      return NextResponse.json({ error: "Invalid vibeId" }, { status: 400 });
    }

    const { roomId, member, state } = createRoom(hostName, vibeId as VibeId);
    return NextResponse.json({ roomId, member, state }, { status: 201 });
  } catch (error) {
    console.error("[API /api/party] Error:", error);
    return NextResponse.json(
      { error: "Internal server error while creating room" },
      { status: 500 }
    );
  }
}
