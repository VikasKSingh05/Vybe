import { NextRequest } from "next/server";
import { getRoom, subscribe } from "@/lib/party/store";
import type { PartyState, PartyPatch } from "@/lib/party/types";
import type { Envelope } from "@/lib/party/store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;
const encoder = new TextEncoder();

const VALID_ROOM_ID = /^[a-zA-Z0-9]{1,12}$/;

function encode(state: PartyState): Uint8Array {
  return encoder.encode(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
}

function encodePatch(patch: PartyPatch): Uint8Array {
  return encoder.encode(`event: patch\ndata: ${JSON.stringify(patch)}\n\n`);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  if (!VALID_ROOM_ID.test(roomId)) {
    return new Response(JSON.stringify({ error: "Invalid room ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`party:stream:${ip}`, {
    maxTokens: 3,
    refillRate: 0.05,
  });
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many connections" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    });
  }

  const memberId = request.nextUrl.searchParams.get("memberId");

  const initial = await getRoom(roomId);
  if (!initial) {
    return new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (msg: Envelope) => {
        if (closed) return;
        try {
          const bytes = msg.event === "state"
            ? encode(msg.data as PartyState)
            : encodePatch(msg.data as PartyPatch);
          controller.enqueue(bytes);
        } catch {
          closed = true;
        }
      };

      send({ event: "state", data: initial });

      const unsubscribe = subscribe(roomId, memberId ?? null, send);

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          closed = true;
        }
      }, HEARTBEAT_MS);

      cleanup = () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
      };

      if (request.signal) {
        request.signal.addEventListener("abort", () => cleanup?.(), { once: true });
      }
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
