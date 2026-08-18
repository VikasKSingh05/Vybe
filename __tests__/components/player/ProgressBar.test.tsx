import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProgressBar } from "@/components/player/ProgressBar";

describe("ProgressBar", () => {
  it("renders the seek slider", () => {
    render(
      <ProgressBar progress={50} currentTime={30} duration={60} accent="#ff0000" onSeek={vi.fn()} />,
    );
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("displays correct aria attributes", () => {
    render(
      <ProgressBar progress={50} currentTime={30} duration={60} accent="#ff0000" onSeek={vi.fn()} />,
    );
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "60");
    expect(slider).toHaveAttribute("aria-valuenow", "30");
  });

  it("calls onSeek with correct time on click", () => {
    const onSeek = vi.fn();
    render(
      <ProgressBar progress={50} currentTime={30} duration={60} accent="#ff0000" onSeek={onSeek} />,
    );
    const slider = screen.getByRole("slider");
    const rect = slider.getBoundingClientRect();
    Object.defineProperty(slider, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 100, top: 0, bottom: 10, right: 100 }),
    });
    fireEvent.click(slider, { clientX: 50 });
    expect(onSeek).toHaveBeenCalledWith(30);
  });

  it("calls onSeek on arrow key", () => {
    const onSeek = vi.fn();
    render(
      <ProgressBar progress={50} currentTime={30} duration={60} accent="#ff0000" onSeek={onSeek} />,
    );
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(onSeek).toHaveBeenCalledWith(35);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowLeft" });
    expect(onSeek).toHaveBeenCalledWith(25);
  });
});
