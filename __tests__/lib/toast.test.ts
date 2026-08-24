import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  toast,
  dismissToast,
  getToasts,
  subscribeToasts,
  resetToasts,
  pauseToast,
  resumeToast,
} from "@/lib/toast";

describe("toast", () => {
  beforeEach(() => {
    resetToasts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetToasts();
  });

  it("adds a toast with an incrementing id", () => {
    const first = toast("Hello", "info");
    const second = toast("World", "error");
    expect(first).toBe(1);
    expect(second).toBe(2);
    const items = getToasts();
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ id: 2, message: "World", tone: "error" });
  });

  it("defaults tone to info", () => {
    toast("Plain");
    expect(getToasts()[0].tone).toBe("info");
  });

  it("rejects empty messages", () => {
    expect(toast("")).toBe(-1);
    expect(toast("   ")).toBe(-1);
    expect(getToasts()).toHaveLength(0);
  });

  it("keeps only the newest 3 toasts", () => {
    toast("one");
    toast("two");
    toast("three");
    const fourth = toast("four");
    expect(fourth).toBe(4);
    const items = getToasts();
    expect(items).toHaveLength(3);
    expect(items.map((t) => t.message)).toEqual(["two", "three", "four"]);
  });

  it("dismisses by id and ignores unknown ids", () => {
    const id = toast("bye soon");
    dismissToast(id);
    expect(getToasts()).toHaveLength(0);
    expect(() => dismissToast(999)).not.toThrow();
  });

  it("auto-dismisses after the duration", () => {
    toast("fleeting", "info", 2000);
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(1999);
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getToasts()).toHaveLength(0);
  });

  it("supports durationMs = 0 for sticky toasts", () => {
    toast("sticky", "info", 0);
    vi.advanceTimersByTime(60_000);
    expect(getToasts()).toHaveLength(1);
  });

  it("notifies subscribers immediately and on change", () => {
    const seen: number[] = [];
    const unsubscribe = subscribeToasts((items) => seen.push(items.length));
    // Immediate snapshot on subscribe
    expect(seen).toEqual([0]);

    toast("a");
    toast("b");
    expect(seen).toEqual([0, 1, 2]);

    unsubscribe();
    toast("c");
    // No further notifications after unsubscribing
    expect(seen).toEqual([0, 1, 2]);
  });

  it("stores durationMs on the item", () => {
    toast("default");
    expect(getToasts()[0].durationMs).toBe(4000);

    dismissToast(getToasts()[0].id);
    toast("timed", "info", 2500);
    expect(getToasts()[0].durationMs).toBe(2500);
  });

  it("pauses and resumes the countdown on demand", () => {
    const id = toast("hover me", "info", 1000);
    vi.advanceTimersByTime(400);
    pauseToast(id);

    // Far past the original expiry — paused, so still alive
    vi.advanceTimersByTime(5000);
    expect(getToasts()).toHaveLength(1);

    resumeToast(id);
    vi.advanceTimersByTime(599);
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getToasts()).toHaveLength(0);
  });

  it("ignores pause/resume for unknown and sticky toasts", () => {
    expect(() => pauseToast(999)).not.toThrow();
    expect(() => resumeToast(999)).not.toThrow();

    const id = toast("sticky", "info", 0);
    pauseToast(id);
    resumeToast(id);
    vi.advanceTimersByTime(60_000);
    expect(getToasts()).toHaveLength(1);
  });

  it("double-pause keeps a single remaining window", () => {
    const id = toast("once", "info", 800);
    vi.advanceTimersByTime(300);
    pauseToast(id);
    pauseToast(id); // second call is a no-op
    vi.advanceTimersByTime(10_000);
    expect(getToasts()).toHaveLength(1);
    resumeToast(id);
    resumeToast(id); // no-op
    vi.advanceTimersByTime(500);
    expect(getToasts()).toHaveLength(0);
  });
});
