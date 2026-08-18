import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrackInfo } from "@/components/player/TrackInfo";

describe("TrackInfo", () => {
  it("renders title and artist", () => {
    render(<TrackInfo title="Test Song" artist="Test Artist" />);
    expect(screen.getByText("Test Song")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  it("renders with lg size", () => {
    render(<TrackInfo title="Song" artist="Artist" size="lg" />);
    const title = screen.getByText("Song");
    expect(title.className).toContain("text-lg");
  });

  it("renders with sm size", () => {
    render(<TrackInfo title="Song" artist="Artist" size="sm" />);
    const title = screen.getByText("Song");
    expect(title.className).toContain("text-xs");
  });

  it("truncates long titles via CSS", () => {
    const longTitle = "ABCDEFGHIJKLMNOP".repeat(10);
    render(<TrackInfo title={longTitle} artist="B" />);
    const title = screen.getByText(longTitle);
    expect(title.className).toContain("truncate");
  });
});
