import { NextRequest, NextResponse } from "next/server";
import { dispatch, getRoom, joinRoom } from "@/lib/party/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { roomId } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const memberId = typeof body?.memberId === "string" ? body.memberId : "";
    const command = typeof body?.command === "string" ? body.command : "";
    const payload =
      body?.payload && typeof body.payload === "object"
        ? (body.payload as Record<string, unknown>)
        : undefined;

    // Joining creates a fresh member identity (no memberId yet).
    if (!memberId && command === "join") {
      const name = typeof body?.name === "string" ? body.name : "";
      const joined = joinRoom(roomId, name);
      if (!joined.ok) {
        return NextResponse.json({ error: joined.error }, { status: joined.status });
      }
      return NextResponse.json({ member: joined.member, state: joined.state });
    }

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const result = dispatch(roomId, memberId, command, payload);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ state: result.state });
  } catch (error) {
    console.error("[API /api/party/[roomId]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error while dispatching command" },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { roomId } = await params;
    const state = getRoom(roomId);
    if (!state) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ state });
  } catch (error) {
    console.error("[API /api/party/[roomId]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
