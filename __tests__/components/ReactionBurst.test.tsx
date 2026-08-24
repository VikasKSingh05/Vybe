import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ReactionBurst } from "@/components/party/ReactionBurst";
import type { PartyReaction } from "@/lib/party/types";

function makeReaction(id: string): PartyReaction {
  return { id, memberId: "m1", memberName: "Asha", emoji: "🔥", at: Date.now() };
}

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function getLayer(container: HTMLElement): HTMLElement {
  const layer = container.firstElementChild;
  expect(layer).not.toBeNull();
  return layer as HTMLElement;
}

describe("ReactionBurst", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("seeds initial reactions without spawning bursts", () => {
    const { container } = render(
      <ReactionBurst reactions={[makeReaction("r1")]} />,
    );
    expect(getLayer(container).children).toHaveLength(0);
  });

  it("spawns one burst per new reaction", () => {
    const { container, rerender } = render(<ReactionBurst reactions={[]} />);
    rerender(
      <ReactionBurst reactions={[makeReaction("r1"), makeReaction("r2")]} />,
    );
    expect(getLayer(container).children).toHaveLength(2);
  });

  it("does not respawn known reactions", () => {
    const { container, rerender } = render(
      <ReactionBurst reactions={[makeReaction("r1")]} />,
    );
    rerender(<ReactionBurst reactions={[makeReaction("r1")]} />);
    expect(getLayer(container).children).toHaveLength(0);
  });

  it("spawns nothing under prefers-reduced-motion", () => {
    mockMatchMedia(true);
    const { container, rerender } = render(<ReactionBurst reactions={[]} />);
    rerender(<ReactionBurst reactions={[makeReaction("r1")]} />);
    expect(getLayer(container).children).toHaveLength(0);
  });
});
