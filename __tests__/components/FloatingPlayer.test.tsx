import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import type { Track } from "@/data/types";

const track: Track = {
  id: "t1",
  title: "Some Song",
  artist: "An Artist",
  duration: 180,
  cover: "/covers/default.jpg",
  accent: "#c41e3a",
};

function makeProps() {
  const calls = {
    onTogglePlay: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onSeek: vi.fn(),
    onVolumeChange: vi.fn(),
    onToggleMute: vi.fn(),
    onToggleQueue: vi.fn(),
    onToggleSettings: vi.fn(),
  };
  return { calls, props: { ...calls, track, accent: "#c41e3a" } };
}

describe("FloatingPlayer layout", () => {
  it("renders settings and queue controls inside the player card", () => {
    const { props } = makeProps();
    render(
      <FloatingPlayer
        {...props}
        isPlaying={false}
        currentTime={0}
        duration={180}
        progress={0}
        volume={0.75}
        isMuted={false}
        queueCount={3}
      />,
    );
    expect(screen.getByLabelText("Open settings")).toBeTruthy();
    expect(screen.getByLabelText("Open queue")).toBeTruthy();
    expect(screen.getByLabelText("Play")).toBeTruthy();
  });

  it("wires the settings and queue buttons to their callbacks", () => {
    const { props, calls } = makeProps();
    render(
      <FloatingPlayer
        {...props}
        isPlaying={false}
        currentTime={0}
        duration={180}
        progress={0}
        volume={0.75}
        isMuted={false}
        queueCount={0}
      />,
    );
    fireEvent.click(screen.getByLabelText("Open settings"));
    fireEvent.click(screen.getByLabelText("Open queue"));
    expect(calls.onToggleSettings).toHaveBeenCalledTimes(1);
    expect(calls.onToggleQueue).toHaveBeenCalledTimes(1);
  });

  it("hides the volume control on narrow (mobile) screens so icons stay in the card", () => {
    const { props } = makeProps();
    render(
      <FloatingPlayer
        {...props}
        isPlaying={false}
        currentTime={0}
        duration={180}
        progress={0}
        volume={0.75}
        isMuted={false}
        queueCount={1}
      />,
    );
    // The volume mute button is wrapped in a container that is hidden below
    // the `sm` breakpoint, keeping the icon cluster inside the card on phones.
    const mute = screen.getByLabelText("Mute");
    const wrapper = mute.closest('[class*="hidden"]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("sm:flex");
  });
});
