import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, act, type RenderResult } from "@testing-library/react";
import { CinematicBackground } from "@/components/CinematicBackground";
import { getVibeTheme } from "@/data/vibes";

// Mock next/image to a plain <img> so we can drive onLoad/onError and inspect src.
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, priority: _priority, sizes, ...rest } = props as {
      fill?: boolean;
      priority?: boolean;
      sizes?: string;
    };
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="" {...rest} sizes={sizes} />
    );
  },
}));

const A = getVibeTheme("bollywood");
const B = getVibeTheme("lofi");
const C = getVibeTheme("indie");
const D = getVibeTheme("chill");

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: () => false,
    })),
  });
}

function imgBySrc(container: HTMLElement, src: string): HTMLImageElement | null {
  const els = Array.from(container.querySelectorAll("img"));
  return els.find((i) => i.getAttribute("src") === src) ?? null;
}

function slotOpacity(container: HTMLElement, src: string): string | null {
  const img = imgBySrc(container, src);
  if (!img) return null;
  return img.parentElement?.style.opacity ?? null;
}

async function loadImage(
  host: RenderResult,
  src: string,
): Promise<void> {
  const img = imgBySrc(host.container, src);
  expect(img).not.toBeNull();
  await act(async () => {
    fireEvent.load(img!);
  });
}

async function errorImage(
  host: RenderResult,
  src: string,
): Promise<void> {
  const img = imgBySrc(host.container, src);
  expect(img).not.toBeNull();
  await act(async () => {
    fireEvent.error(img!);
  });
}

function isVisible(container: HTMLElement, src: string): boolean {
  return slotOpacity(container, src) === "1";
}
function isHidden(container: HTMLElement, src: string): boolean {
  return slotOpacity(container, src) === "0";
}
function isNotVisible(container: HTMLElement, src: string): boolean {
  const img = imgBySrc(container, src);
  // Not present, or present but not the fully-visible layer.
  return img === null || (img.parentElement?.style.opacity ?? "1") !== "1";
}

describe("CinematicBackground vibe transition", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("shows the initial background immediately (landing reveal unchanged)", () => {
    const host = render(<CinematicBackground theme={A} />);
    expect(isVisible(host.container, A.background)).toBe(true);
  });

  it("A -> B crossfades and ends with B visible", async () => {
    const host = render(<CinematicBackground theme={A} />);
    host.rerender(<CinematicBackground theme={B} />);

    // While B loads, A remains fully visible and B stays hidden.
    expect(isVisible(host.container, A.background)).toBe(true);
    expect(isHidden(host.container, B.background)).toBe(true);

    await loadImage(host, B.background);

    expect(isVisible(host.container, B.background)).toBe(true);
    expect(isHidden(host.container, A.background)).toBe(true);
  });

  it("A -> B while B is slow keeps A fully visible the whole time", async () => {
    const host = render(<CinematicBackground theme={A} />);
    host.rerender(<CinematicBackground theme={B} />);

    // Before B is ready, A is the only visible layer.
    expect(isVisible(host.container, A.background)).toBe(true);
    expect(isHidden(host.container, B.background)).toBe(true);

    // Still nothing shown even after some ticks (no guessed timeout).
    await new Promise((r) => setTimeout(r, 50));
    expect(isVisible(host.container, A.background)).toBe(true);
    expect(isHidden(host.container, B.background)).toBe(true);

    await loadImage(host, B.background);
    expect(isVisible(host.container, B.background)).toBe(true);
    expect(isHidden(host.container, A.background)).toBe(true);
  });

  it("A -> B -> C rapidly never shows B; final visible is C", async () => {
    const host = render(<CinematicBackground theme={A} />);
    host.rerender(<CinematicBackground theme={B} />);
    // B is replaced by C before B ever loads.
    host.rerender(<CinematicBackground theme={C} />);

    // A still visible, B not present/visible, C hidden pending.
    expect(isVisible(host.container, A.background)).toBe(true);
    expect(imgBySrc(host.container, B.background)).toBeNull();
    expect(isHidden(host.container, C.background)).toBe(true);

    await loadImage(host, C.background);

    expect(isVisible(host.container, C.background)).toBe(true);
    expect(isHidden(host.container, A.background)).toBe(true);
    expect(imgBySrc(host.container, B.background)).toBeNull();
  });

  it("A -> B -> C -> D rapidly never shows B/C; final visible is D", async () => {
    const host = render(<CinematicBackground theme={A} />);
    host.rerender(<CinematicBackground theme={B} />);
    host.rerender(<CinematicBackground theme={C} />);
    host.rerender(<CinematicBackground theme={D} />);

    expect(isVisible(host.container, A.background)).toBe(true);
    expect(imgBySrc(host.container, B.background)).toBeNull();
    expect(imgBySrc(host.container, C.background)).toBeNull();
    expect(isHidden(host.container, D.background)).toBe(true);

    await loadImage(host, D.background);

    expect(isVisible(host.container, D.background)).toBe(true);
    expect(isHidden(host.container, A.background)).toBe(true);
  });

  it("A -> B where B fails to load keeps A visible", async () => {
    const host = render(<CinematicBackground theme={A} />);
    host.rerender(<CinematicBackground theme={B} />);

    await errorImage(host, B.background);

    expect(isVisible(host.container, A.background)).toBe(true);
    // B never became the visible layer.
    expect(isHidden(host.container, B.background)).toBe(true);
  });

  it("A -> B -> A produces no stale B flash", async () => {
    const host = render(<CinematicBackground theme={A} />);
    host.rerender(<CinematicBackground theme={B} />);
    // Back to A before B loads.
    host.rerender(<CinematicBackground theme={A} />);

    // A stays fully visible throughout; B, if present, is never visible.
    expect(isVisible(host.container, A.background)).toBe(true);
    expect(isNotVisible(host.container, B.background)).toBe(true);

    await loadImage(host, A.background);
    expect(isVisible(host.container, A.background)).toBe(true);
    expect(isNotVisible(host.container, B.background)).toBe(true);
  });

  it("respects prefers-reduced-motion: hard switch after load", async () => {
    mockMatchMedia(true);
    const host = render(<CinematicBackground theme={A} />);
    host.rerender(<CinematicBackground theme={B} />);

    expect(isVisible(host.container, A.background)).toBe(true);
    expect(isHidden(host.container, B.background)).toBe(true);

    await loadImage(host, B.background);

    expect(isVisible(host.container, B.background)).toBe(true);
    expect(isHidden(host.container, A.background)).toBe(true);
  });
});
