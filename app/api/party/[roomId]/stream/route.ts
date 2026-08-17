import { NextRequest } from "next/server";
import { getRoom, subscribe } from "@/lib/party/store";
import type { PartyState } from "@/lib/party/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;
const encoder = new TextEncoder();

function encodeState(state: PartyState): Uint8Array {
  return encoder.encode(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const memberId = request.nextUrl.searchParams.get("memberId");

  const initial = getRoom(roomId);
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

      const send = (state: PartyState) => {
        if (closed) return;
        try {
          controller.enqueue(encodeState(state));
        } catch {
          closed = true;
        }
      };

      send(initial);

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
