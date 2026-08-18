import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransportControls } from "@/components/player/TransportControls";

describe("TransportControls", () => {
  const defaultProps = {
    isPlaying: false,
    disabled: false,
    accent: "#ff0000",
    onTogglePlay: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
  };

  it("renders play button when not playing", () => {
    render(<TransportControls {...defaultProps} />);
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
  });

  it("renders pause button when playing", () => {
    render(<TransportControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
  });

  it("calls onTogglePlay when play/pause is clicked", () => {
    const onTogglePlay = vi.fn();
    render(<TransportControls {...defaultProps} onTogglePlay={onTogglePlay} />);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(onTogglePlay).toHaveBeenCalledOnce();
  });

  it("calls onPrev when prev is clicked", () => {
    const onPrev = vi.fn();
    render(<TransportControls {...defaultProps} onPrev={onPrev} />);
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it("calls onNext when next is clicked", () => {
    const onNext = vi.fn();
    render(<TransportControls {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("disables all buttons when disabled is true", () => {
    render(<TransportControls {...defaultProps} disabled={true} />);
    expect(screen.getByRole("button", { name: /play/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });
});
