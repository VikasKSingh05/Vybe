import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from "vitest";
import { renderHook, type RenderHookResult } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { ShortcutHandlers } from "@/hooks/useKeyboardShortcuts";

function createHandlers(): Mocked<ShortcutHandlers> {
  return {
    onTogglePlay: vi.fn(),
    onSeek: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onToggleMute: vi.fn(),
  };
}

function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  window.dispatchEvent(event);
  return event;
}

/** Simulates a keypress originating on a specific element (bubbles to window). */
function pressOn(el: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  el.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  let handlers: Mocked<ShortcutHandlers>;
  let mounted: RenderHookResult<void, { h: Mocked<ShortcutHandlers> }>;

  beforeEach(() => {
    handlers = createHandlers();
    mounted = renderHook(({ h }) => useKeyboardShortcuts(h), {
      initialProps: { h: handlers },
    });
  });

  afterEach(() => {
    mounted.unmount();
    document.body.innerHTML = "";
  });

  it("toggles play on Space", () => {
    const event = press(" ");
    expect(handlers.onTogglePlay).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets Space activate a focused button instead of toggling play", () => {
    const button = document.createElement("button");
    button.textContent = "Play";
    document.body.appendChild(button);

    pressOn(button, " ");
    expect(handlers.onTogglePlay).not.toHaveBeenCalled();
  });

  it("ignores all shortcuts while typing in an input", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);

    pressOn(input, " ");
    pressOn(input, "ArrowLeft");
    pressOn(input, "n");
    pressOn(input, "m");

    expect(handlers.onTogglePlay).not.toHaveBeenCalled();
    expect(handlers.onSeek).not.toHaveBeenCalled();
    expect(handlers.onNext).not.toHaveBeenCalled();
    expect(handlers.onToggleMute).not.toHaveBeenCalled();
  });

  it("ignores shortcuts inside contentEditable", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    document.body.appendChild(div);

    pressOn(div, "p");
    expect(handlers.onPrev).not.toHaveBeenCalled();
  });

  it("seeks ±5s with arrow keys", () => {
    press("ArrowLeft");
    expect(handlers.onSeek).toHaveBeenCalledWith(-5);
    press("ArrowRight");
    expect(handlers.onSeek).toHaveBeenCalledWith(5);
  });

  it("maps N/P/M to next/prev/mute", () => {
    press("n");
    press("P");
    press("m");
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
    expect(handlers.onPrev).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("ignores modified combos like Ctrl+N", () => {
    press("n", { ctrlKey: true });
    press(" ", { metaKey: true });
    expect(handlers.onNext).not.toHaveBeenCalled();
    expect(handlers.onTogglePlay).not.toHaveBeenCalled();
  });

  it("always calls the latest handlers after re-render", () => {
    const latest = createHandlers();
    mounted.rerender({ h: latest });

    press(" ");
    expect(latest.onTogglePlay).toHaveBeenCalledTimes(1);
    expect(handlers.onTogglePlay).not.toHaveBeenCalled();
  });

  describe("when disabled (overlay open)", () => {
    beforeEach(() => {
      // The outer suite mounts an enabled hook sharing `handlers`; unmount it
      // so it cannot respond to events in these isolated tests.
      mounted.unmount();
    });

    it("does not run any player shortcuts", () => {
      const h = createHandlers();
      renderHook(() => useKeyboardShortcuts(h, false));

      press(" ");
      press("ArrowLeft");
      press("ArrowRight");
      press("n");
      press("P");
      press("m");

      expect(h.onTogglePlay).not.toHaveBeenCalled();
      expect(h.onSeek).not.toHaveBeenCalled();
      expect(h.onNext).not.toHaveBeenCalled();
      expect(h.onPrev).not.toHaveBeenCalled();
      expect(h.onToggleMute).not.toHaveBeenCalled();
    });

    it("does not prevent default (lets the focused UI handle the key)", () => {
      const h = createHandlers();
      renderHook(() => useKeyboardShortcuts(h, false));

      const event = press(" ");
      expect(event.defaultPrevented).toBe(false);
      expect(h.onTogglePlay).not.toHaveBeenCalled();
    });

    it("re-enables shortcuts when set back to true", () => {
      const h = createHandlers();
      const toggled = renderHook(
        ({ on }: { on: boolean }) => useKeyboardShortcuts(h, on),
        { initialProps: { on: false } },
      );
      press(" ");
      expect(h.onTogglePlay).not.toHaveBeenCalled();

      toggled.rerender({ on: true });
      press(" ");
      expect(h.onTogglePlay).toHaveBeenCalledTimes(1);
    });
  });
});
