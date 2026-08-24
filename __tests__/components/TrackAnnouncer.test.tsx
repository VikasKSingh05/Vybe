import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrackAnnouncer } from "@/components/player/TrackAnnouncer";

describe("TrackAnnouncer", () => {
  it("renders nothing without a title", () => {
    render(<TrackAnnouncer title={null} artist="Someone" />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("announces the track with the artist", () => {
    render(<TrackAnnouncer title="Song A" artist="Artist B" />);
    expect(screen.getByRole("status").textContent).toBe(
      "Now playing Song A by Artist B",
    );
  });

  it("announces the track alone when no artist is given", () => {
    render(<TrackAnnouncer title="Song A" />);
    expect(screen.getByRole("status").textContent).toBe("Now playing Song A");
  });

  it("updates the announcement when the track changes", () => {
    const mounted = render(<TrackAnnouncer title="Song A" artist="Artist B" />);
    mounted.rerender(<TrackAnnouncer title="Song C" artist="Artist D" />);
    expect(screen.getByRole("status").textContent).toBe(
      "Now playing Song C by Artist D",
    );
  });
});
