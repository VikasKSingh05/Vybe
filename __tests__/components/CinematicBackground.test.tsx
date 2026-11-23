import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { CinematicBackground } from "@/components/CinematicBackground";
import { liveTheme } from "@/data/backgrounds";

// Mock next/image to a plain <img> so we can drive onError and inspect src.
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

describe("CinematicBackground single live station", () => {
  it("renders the fixed VYBE LIVE artwork", () => {
    const host = render(<CinematicBackground theme={liveTheme} />);
    expect(host.container.querySelector("img")?.getAttribute("src")).toBe(
      liveTheme.background,
    );
  });

  it("keeps the gradient fallback when the artwork fails to load", async () => {
    const host = render(<CinematicBackground theme={liveTheme} />);
    const image = host.container.querySelector("img");
    expect(image).not.toBeNull();

    await act(async () => {
      fireEvent.error(image!);
    });

    expect(host.container.querySelector("img")).toBeNull();
    expect(host.container.innerHTML).toContain("linear-gradient");
  });

  it("does not change the station identity when re-rendered", () => {
    const host = render(<CinematicBackground theme={liveTheme} />);
    const src = host.container.querySelector("img")?.getAttribute("src");
    host.rerender(<CinematicBackground theme={liveTheme} />);
    expect(host.container.querySelector("img")?.getAttribute("src")).toBe(src);
  });
});
