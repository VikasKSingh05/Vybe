import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LiveStationPanel } from "@/components/LiveStationPanel";
import type { QueueItem, Track } from "@/data/types";
import type { StationHealth } from "@/lib/radio/types";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

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

const track: Track = {
  id: "now",
  title: "Now Playing",
  artist: "Live Artist",
  duration: 180,
  accent: "#b06cff",
};

const queue: QueueItem[] = [
  { queueItemId: "now", title: "Now Playing", artist: "Live Artist", duration: 180 },
  { queueItemId: "1", title: "Next One", artist: "Artist One", duration: 200 },
  { queueItemId: "2", title: "Next Two", artist: "Artist Two", duration: 210 },
  { queueItemId: "3", title: "Next Three", artist: "Artist Three" },
  { queueItemId: "4", title: "Next Four", artist: "Artist Four" },
];

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof LiveStationPanel>> = {},
) {
  const props: React.ComponentProps<typeof LiveStationPanel> = {
    track,
    status: "live",
    isSyncing: false,
    hasCurrentTrack: true,
    queue,
    accent: "#b06cff",
    isPlaying: false,
    searchOverlay: <div>Search</div>,
    onRetry: vi.fn(),
    onOpenQueue: vi.fn(),
    onTogglePlay: vi.fn(),
    ...overrides,
  };
  return { ...render(<LiveStationPanel {...props} />), props };
}

describe("LiveStationPanel", () => {
  it("shows a live status with the shared broadcast track", () => {
    renderPanel();
    expect(screen.getByText("LIVE")).toBeTruthy();
    expect(screen.getByText("Now Playing")).toBeTruthy();
  });

  it("shows a tuning state and disables playback before the wire arrives", () => {
    renderPanel({
      status: null,
      hasCurrentTrack: false,
      isSyncing: true,
    });
    expect(screen.getByText("TUNING IN")).toBeTruthy();
    expect(screen.getByText(/Tuning in/)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Play broadcast" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByText("Now Playing")).toBeNull();
  });

  it("shows a reconnecting state without losing the current track", () => {
    renderPanel({ status: "recovering" as StationHealth });
    expect(screen.getByText("RECONNECTING")).toBeTruthy();
    expect(screen.getByText("Now Playing")).toBeTruthy();
  });

  it("offers a safe retry when the broadcast is unavailable", () => {
    const onRetry = vi.fn();
    renderPanel({ status: "unavailable", onRetry });
    expect(screen.getByText("OFFLINE")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows a bounded up-next list and opens the full queue", () => {
    const onOpenQueue = vi.fn();
    renderPanel({ onOpenQueue });
    expect(screen.getByText("Next One")).toBeTruthy();
    expect(screen.getByText("Next Three")).toBeTruthy();
    expect(screen.queryByText("Next Four")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Full queue/ }));
    expect(onOpenQueue).toHaveBeenCalledTimes(1);
  });

  it("toggles playback from the station surface", () => {
    const onTogglePlay = vi.fn();
    renderPanel({ isPlaying: true, onTogglePlay });
    fireEvent.click(screen.getByRole("button", { name: "Pause broadcast" }));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });
});
