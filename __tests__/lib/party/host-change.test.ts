import { describe, it, expect } from "vitest";
import { detectHostChange } from "@/lib/party/host-change";
import type { PartyMember } from "@/lib/party/types";

function makeMember(id: string, name = `Member ${id}`): PartyMember {
  return { id, name, isHost: false, joinedAt: 0, lastSeen: 0 };
}

describe("detectHostChange", () => {
  const members = [makeMember("a", "Asha"), makeMember("b", "Bilal")];

  it("returns null when the host did not change", () => {
    expect(detectHostChange("a", "a", members)).toBeNull();
  });

  it("returns null when there is no prior knowledge of the host", () => {
    expect(detectHostChange("", "a", members)).toBeNull();
  });

  it("returns null when there is no new host", () => {
    expect(detectHostChange("a", "", members)).toBeNull();
  });

  it("returns null when the new host id has no matching member", () => {
    expect(detectHostChange("a", "ghost", members)).toBeNull();
  });

  it("detects a handoff and resolves the new host's identity", () => {
    expect(detectHostChange("a", "b", members)).toEqual({
      hostId: "b",
      hostName: "Bilal",
    });
  });
});
