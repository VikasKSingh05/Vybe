import { describe, it, expect } from "vitest";
import { createRedisStore } from "@/lib/party/store-redis";

type SharedState = {
  data: Map<string, string>;
  watched: Map<string, string>;
  conflictOnce: boolean;
};

class FakeRedis {
  constructor(private shared: SharedState) {}

  duplicate(): FakeRedis {
    return new FakeRedis(this.shared);
  }

  on(): void {}

  async get(key: string): Promise<string | null> {
    return this.shared.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<string> {
    this.shared.data.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.shared.data.delete(key) ? 1 : 0;
  }

  async keys(): Promise<string[]> {
    return [...this.shared.data.keys()];
  }

  async scan(): Promise<[string, string[]]> {
    return ["0", [...this.shared.data.keys()]];
  }

  async publish(): Promise<number> {
    return 0;
  }

  async subscribe(): Promise<number> {
    return 0;
  }

  async unsubscribe(): Promise<number> {
    return 0;
  }

  async watch(key: string): Promise<string> {
    this.shared.watched.set(key, this.shared.data.get(key) ?? "");
    return "OK";
  }

  async unwatch(): Promise<string> {
    this.shared.watched.clear();
    return "OK";
  }

  multi() {
    const writes: Array<() => void> = [];
    return {
      set: (key: string, value: string) => {
        writes.push(() => this.shared.data.set(key, value));
        return this;
      },
      del: (key: string) => {
        writes.push(() => this.shared.data.delete(key));
        return this;
      },
      exec: async (): Promise<Array<unknown> | null> => {
        const key = [...this.shared.watched.keys()][0] ?? "";
        if (this.shared.conflictOnce) {
          this.shared.conflictOnce = false;
          // Simulate another instance transferring host authority first.
          const raw = this.shared.data.get(key);
          if (raw) {
            const state = JSON.parse(raw) as { hostId: string; version: number };
            state.hostId = "guestbbbbbb";
            state.version += 1;
            this.shared.data.set(key, JSON.stringify(state));
          }
          return null;
        }
        if ((this.shared.data.get(key) ?? "") !== (this.shared.watched.get(key) ?? "")) {
          return null;
        }
        writes.forEach((write) => write());
        return writes.map(() => "OK");
      },
    };
  }
}

describe("Redis party store CAS", () => {
  it("re-authorizes after a concurrent write instead of overwriting a host transfer", async () => {
    const shared: SharedState = { data: new Map(), watched: new Map(), conflictOnce: true };
    const roomId = "room123";
    const key = `vybe:room:${roomId}`;
    const state = {
      roomId,
      createdAt: 1,
      hostId: "hostaaaaaa",
      vibeId: "chill",
      members: [
        { id: "hostaaaaaa", name: "Host", joinedAt: 1, lastSeen: Date.now() },
        { id: "guestbbbbbb", name: "Guest", joinedAt: 2, lastSeen: Date.now() },
      ],
      queue: [],
      playback: null,
      reactions: [],
      locked: false,
      version: 1,
      serverNow: 1_000,
    };
    shared.data.set(key, JSON.stringify(state));

    const store = createRedisStore(new FakeRedis(shared) as unknown as Parameters<typeof createRedisStore>[0]);
    const result = await store.dispatch(roomId, "hostaaaaaa", "transferHost", {
      targetMemberId: "guestbbbbbb",
    });

    // The stale host must not be allowed to commit another mutation on retry.
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);

    const persisted = JSON.parse(shared.data.get(key)!) as typeof state;
    expect(persisted.hostId).toBe("guestbbbbbb");
    expect(persisted.members.some((m) => m.id === persisted.hostId)).toBe(true);
  });
});
