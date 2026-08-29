import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { SettingsOverlay } from "@/components/SettingsOverlay";

function stubMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderSettings(overrides: Record<string, unknown> = {}) {
  const handlers = {
    onClose: vi.fn(),
    onToggleCrossfade: vi.fn(),
    onRepeatModeChange: vi.fn(),
    onToggleShuffle: vi.fn(),
  };
  render(
    <SettingsOverlay
      isOpen
      accent="#b06cff"
      crossfadeEnabled
      repeatMode="all"
      shuffle={false}
      onClose={handlers.onClose}
      onToggleCrossfade={handlers.onToggleCrossfade}
      onRepeatModeChange={handlers.onRepeatModeChange}
      onToggleShuffle={handlers.onToggleShuffle}
      {...overrides}
    />,
  );
  return handlers;
}

describe("SettingsOverlay", () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it("renders the dialog and both control sections", () => {
    renderSettings();
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeTruthy();
    expect(screen.getByText("Playback order")).toBeTruthy();
    expect(screen.getByText("Crossfade")).toBeTruthy();
  });

  it("does not render a volume section (it lives in the player)", () => {
    renderSettings();
    expect(screen.queryByText("Volume")).toBeNull();
    expect(screen.queryByRole("slider", { name: "Volume" })).toBeNull();
  });

  it("reports the correct repeat mode via aria-pressed", () => {
    renderSettings({ repeatMode: "one" });
    expect(screen.getByRole("button", { name: "One" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("switches repeat mode via callback", () => {
    const handlers = renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Off" }));
    expect(handlers.onRepeatModeChange).toHaveBeenCalledWith("off");
  });

  it("reflects shuffle state on the switch", () => {
    renderSettings({ shuffle: true });
    expect(screen.getByRole("switch", { name: "Shuffle" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("toggles shuffle via callback", () => {
    const handlers = renderSettings();
    fireEvent.click(screen.getByRole("switch", { name: "Shuffle" }));
    expect(handlers.onToggleShuffle).toHaveBeenCalledTimes(1);
  });

  it("reflects and toggles crossfade", () => {
    renderSettings({ crossfadeEnabled: true });
    const toggle = screen.getByRole("switch", { name: "Enable crossfade" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("does not render a crossfade duration slider", () => {
    renderSettings();
    expect(screen.queryByRole("slider", { name: "Crossfade duration" })).toBeNull();
    expect(screen.queryByText("Duration")).toBeNull();
  });

  it("closes on Escape", () => {
    const handlers = renderSettings();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it("closes via the close button and backdrop", () => {
    const handlers = renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(handlers.onClose).toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    fireEvent.click(dialog.previousElementSibling as HTMLElement);
    expect(handlers.onClose).toHaveBeenCalledTimes(2);
  });
});
