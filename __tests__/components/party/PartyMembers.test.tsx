import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { PartyMembers } from "@/components/party/PartyMembers";
import type { PartyMember } from "@/lib/party/types";

function makeMember(id: string, name: string, isHost: boolean): PartyMember {
  return { id, name, isHost, joinedAt: 0, lastSeen: Date.now() };
}

function setup(overrides: Partial<Parameters<typeof PartyMembers>[0]> = {}) {
  const members = [
    makeMember("host-1", "Asha", true),
    makeMember("guest-1", "Bilal", false),
    makeMember("guest-2", "Chandra", false),
  ];
  const onHandover = vi.fn();
  const props = {
    members,
    hostId: "host-1",
    meId: "host-1",
    serverNow: Date.now(),
    accent: "#b06cff",
    onInvite: undefined,
    isHostView: true,
    onHandover,
    ...overrides,
  };
  return { onHandover, ...render(<PartyMembers {...props} />) };
}

describe("PartyMembers host hand-over", () => {
  it("shows a hand-over button for every other member when viewing as host", () => {
    setup();
    const buttons = screen.getAllByRole("button", { name: /^Make .* the host$/ });
    expect(buttons).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Make Bilal the host" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Make Chandra the host" })).toBeTruthy();
  });

  it("calls onHandover with the target member id", () => {
    const { onHandover } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Make Bilal the host" }));
    expect(onHandover).toHaveBeenCalledWith("guest-1");
  });

  it("hides hand-over buttons for non-host viewers", () => {
    setup({ meId: "guest-1", isHostView: false });
    expect(
      screen.queryAllByRole("button", { name: /^Make .* the host$/ }),
    ).toHaveLength(0);
  });

  it("hides hand-over buttons when no handler is provided", () => {
    setup({ onHandover: undefined });
    expect(
      screen.queryAllByRole("button", { name: /^Make .* the host$/ }),
    ).toHaveLength(0);
  });
});
