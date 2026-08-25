import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useParty } from "@/hooks/useParty";
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({ toast: vi.fn() }));
const toastMock = vi.mocked(toast);

class FakeEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  readyState = FakeEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;

  constructor(url: string) {
    FakeEventSource.instances.push(this);
    this.url = url;
  }

  addEventListener() {}
  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  simulateOpen() {
    this.readyState = FakeEventSource.OPEN;
    this.onopen?.();
  }

  simulateFatalError() {
    // Browser fires error with CLOSED when the connection can't be made.
    this.readyState = FakeEventSource.CLOSED;
    this.onerror?.();
  }

  static instances: FakeEventSource[] = [];
}

type FetchResponder = (url: string, init?: RequestInit) => Response | Promise<Response> | never;
let respond: FetchResponder;

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }
  });
}

const CREATE_BODY = {
  roomId: "abc123",
  member: { id: "m1", name: "Host" },
  state: { members: [], queue: [], version: 1 },
};

describe("useParty dead-stream handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(respond(String(input), init)),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    toastMock.mockClear();
  });

  function setupDefaultRouting(): void {
    respond = (url, init) => {
      if (url === "/api/party" && init?.method === "POST") return jsonResponse(200, CREATE_BODY);
      if (url.endsWith("/api/party/abc123") && !init?.method) return jsonResponse(200, CREATE_BODY.state);
      return jsonResponse(404, { error: "Not found" });
    };
  }

  async function createPartyViaHook() {
    const { result } = renderHook(() => useParty());
    await act(async () => {
      await result.current.createParty("Host", "chill");
    });
    return result;
  }

  it("stops retrying and cleans up when the room is gone (404 probe)", async () => {
    setupDefaultRouting();
    const result = await createPartyViaHook();
    const es = FakeEventSource.instances[0];
    es.simulateOpen();

    // Room no longer exists server-side: GET probe 404s, POSTs still succeed
    respond = (_url, init) =>
      init?.method === "POST"
        ? jsonResponse(200, CREATE_BODY)
        : jsonResponse(404, { error: "Room not found" });

    await act(async () => {
      es.simulateFatalError();
    });
    await flushMicrotasks();

    expect(toastMock).toHaveBeenCalledWith("This party has ended", "info");
    expect(result.current.status).toBe("closed");
    expect(result.current.state).toBeNull();
    expect(sessionStorage.getItem("vybe.party.session")).toBeNull();

    // No reconnect attempts despite time passing
    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("keeps backing off on network failures (probe throws)", async () => {
    setupDefaultRouting();
    const result = await createPartyViaHook();
    const es = FakeEventSource.instances[0];
    es.simulateOpen();

    // Probe itself fails at the network level
    respond = () => {
      throw new TypeError("network down");
    };

    await act(async () => {
      es.simulateFatalError();
    });
    await flushMicrotasks();

    expect(result.current.status).toBe("reconnecting");
    expect(toastMock).not.toHaveBeenCalledWith("This party has ended", "info");

    await act(async () => {
      vi.advanceTimersByTime(4_000);
    });
    expect(FakeEventSource.instances.length).toBeGreaterThanOrEqual(2);
  });
});
