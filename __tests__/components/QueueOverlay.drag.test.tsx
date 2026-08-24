import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { QueueOverlay } from "@/components/QueueOverlay";
import type { QueueItem } from "@/data/types";

const ROW_HEIGHT = 64;

function makeItem(id: string, title: string): QueueItem {
  return {
    queueItemId: id,
    title,
    artist: `${title} Artist`,
  };
}

function fakeRect(top: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    left: 0,
    right: 240,
    bottom: top + ROW_HEIGHT,
    width: 240,
    height: ROW_HEIGHT,
    toJSON: () => ({}),
  } as DOMRect;
}

function setup(titles: string[] = ["Alpha", "Bravo", "Charlie"]) {
  const onReorder = vi.fn();
  const onClose = vi.fn();
  const { container } = render(
    <QueueOverlay
      queue={titles.map((t, i) => makeItem(`id-${i}`, t))}
      currentIndex={-1}
      accent="#f97316"
      isOpen={true}
      onClose={onClose}
      onRemove={vi.fn()}
      onPlayItem={vi.fn()}
      onReorder={onReorder}
    />,
  );

  // The drag engine reads geometry off the <ul>'s direct children — give
  // jsdom a realistic stacked-row layout.
  const ul = container.querySelector("ul");
  const rows = Array.from((ul ?? container).children) as HTMLElement[];
  rows.forEach((row, i) => {
    vi.spyOn(row, "getBoundingClientRect").mockReturnValue(fakeRect(i * ROW_HEIGHT));
  });

  const grips = screen.getAllByRole("button", { name: /^Reorder / });
  return { onReorder, onClose, grips, rows };
}

describe("QueueOverlay pointer-drag engine", () => {
  beforeAll(() => {
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  it("ignores sub-threshold movement and never activates", () => {
    const { onReorder, grips } = setup();
    const grip = grips[0];
    fireEvent.pointerDown(grip, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientY: 32,
    });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 35 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("reorders across two slots when dragged past them", () => {
    const { onReorder, grips } = setup();
    const grip = grips[0];
    fireEvent.pointerDown(grip, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientY: 32,
    });
    // Center starts at 32; must pass row2's bottom (192) to claim slot 2.
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 200 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  it("shifts crossed siblings by one row height while dragging", () => {
    const { grips, rows } = setup();
    const grip = grips[0];
    fireEvent.pointerDown(grip, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientY: 32,
    });
    // Just past row1's bottom (128): target becomes 1.
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 130 });
    expect(rows[1].style.transform).toBe(`translateY(-${ROW_HEIGHT}px)`);
    fireEvent.pointerUp(grip, { pointerId: 1 });
  });

  it("aborts cleanly on pointercancel without reordering", () => {
    const { onReorder, grips } = setup();
    const grip = grips[0];
    fireEvent.pointerDown(grip, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientY: 32,
    });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 200 });
    fireEvent.pointerCancel(grip, { pointerId: 1 });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("cleans inline drag styles from all rows on release", () => {
    const { grips, rows } = setup();
    const grip = grips[0];
    fireEvent.pointerDown(grip, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientY: 32,
    });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 130 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    rows.forEach((row) => {
      expect(row.style.transform).toBe("");
      expect(row.style.transition).toBe("");
      expect(row.style.zIndex).toBe("");
    });
  });

  it("ignores drags started with a non-primary mouse button", () => {
    const { onReorder, grips } = setup();
    const grip = grips[0];
    fireEvent.pointerDown(grip, {
      pointerId: 1,
      pointerType: "mouse",
      button: 2,
      clientY: 32,
    });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 200 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(onReorder).not.toHaveBeenCalled();
  });
});
