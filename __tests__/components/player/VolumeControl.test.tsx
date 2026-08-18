import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VolumeControl } from "@/components/player/VolumeControl";

describe("VolumeControl", () => {
  const defaultProps = {
    volume: 0.75,
    isMuted: false,
    accent: "#ff0000",
    onVolumeChange: vi.fn(),
    onToggleMute: vi.fn(),
  };

  it("renders mute button with volume icon", () => {
    render(<VolumeControl {...defaultProps} />);
    expect(screen.getByRole("button", { name: /mute/i })).toBeInTheDocument();
  });

  it("renders unmute button when muted", () => {
    render(<VolumeControl {...defaultProps} isMuted={true} />);
    expect(screen.getByRole("button", { name: /unmute/i })).toBeInTheDocument();
  });

  it("calls onToggleMute when mute button is clicked", () => {
    const onToggleMute = vi.fn();
    render(<VolumeControl {...defaultProps} onToggleMute={onToggleMute} />);
    fireEvent.click(screen.getByRole("button", { name: /mute/i }));
    expect(onToggleMute).toHaveBeenCalledOnce();
  });

  it("calls onVolumeChange when slider changes", () => {
    const onVolumeChange = vi.fn();
    render(<VolumeControl {...defaultProps} onVolumeChange={onVolumeChange} />);
    fireEvent.change(screen.getByRole("slider", { name: /volume/i }), {
      target: { value: "0.5" },
    });
    expect(onVolumeChange).toHaveBeenCalledWith(0.5);
  });

  it("shows muted icon when volume is 0", () => {
    render(<VolumeControl {...defaultProps} volume={0} />);
    expect(screen.getByRole("button", { name: /mute/i })).toBeInTheDocument();
  });
});
