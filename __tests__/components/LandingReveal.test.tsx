import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LandingReveal } from "@/components/LandingReveal";

function setReducedMotion(value: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: value,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });
}

describe("LandingReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("shows the VYBE splash on mount", () => {
    setReducedMotion(false);
    render(<LandingReveal accent="#c41e3a" />);
    expect(screen.getByText("VYBE")).toBeTruthy();
  });

  it("dismisses itself after the reveal choreography", async () => {
    setReducedMotion(false);
    render(<LandingReveal accent="#c41e3a" />);
    expect(screen.getByText("VYBE")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(screen.queryByText("VYBE")).toBeNull();
  });

  it("skips straight to revealed when the user prefers reduced motion", () => {
    setReducedMotion(true);
    render(<LandingReveal accent="#c41e3a" />);
    // Mounted with done=false, but the effect dismisses it immediately.
    expect(screen.queryByText("VYBE")).toBeNull();
  });
});
