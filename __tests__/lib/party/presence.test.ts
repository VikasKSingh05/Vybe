import { describe, it, expect } from "vitest";
import { getPresence } from "@/lib/party/presence";
import type { PartyMember } from "@/lib/party/types";

function makeMember(lastSeen: number): PartyMember {
  return {
    id: "m1",
    name: "Asha",
    isHost: false,
    joinedAt: 0,
    lastSeen,
  };
}

describe("getPresence", () => {
  it("is active when the heartbeat is fresh", () => {
    expect(getPresence(makeMember(60_000), 90_000)).toBe("active");
  });

  it("is away once the heartbeat goes stale", () => {
    expect(getPresence(makeMember(0), 200_000)).toBe("away");
  });

  it("treats exactly-at-threshold as active", () => {
    expect(getPresence(makeMember(0), 120_000)).toBe("active");
  });

  it("honours a custom threshold", () => {
    expect(getPresence(makeMember(0), 45_000, 30_000)).toBe("away");
  });
});
