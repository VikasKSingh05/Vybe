import { NextRequest, NextResponse } from "next/server";
import { dispatch, getRoom, joinRoom } from "@/lib/party/store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_COMMANDS = [
  "join", "leave", "addTrack", "removeTrack", "next", "prev",
  "play", "pause", "seek", "playTrack", "setVibe", "clearQueue",
  "heartbeat", "reaction",
];

const VALID_ROOM_ID = /^[a-zA-Z0-9]{1,12}$/;

type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { roomId } = await params;

  if (!VALID_ROOM_ID.test(roomId)) {
    return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`party:dispatch:${ip}`, {
    maxTokens: 30,
    refillRate: 0.5,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
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
      const joined = await joinRoom(roomId, name);
      if (!joined.ok) {
        return NextResponse.json({ error: joined.error }, { status: joined.status });
      }
      return NextResponse.json({ member: joined.member, state: joined.state });
    }

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    if (!VALID_COMMANDS.includes(command)) {
      return NextResponse.json({ error: "Unknown command" }, { status: 400 });
    }

    const result = await dispatch(roomId, memberId, command, payload);
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
  const { roomId } = await params;

  if (!VALID_ROOM_ID.test(roomId)) {
    return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
  }

  try {
    const state = await getRoom(roomId);
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
