import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { QueueOverlay } from "@/components/QueueOverlay";
import type { QueueItem } from "@/data/types";

function makeItem(id: string, title: string): QueueItem {
  return {
    queueItemId: id,
    title,
    artist: `${title} Artist`,
  };
}

describe("QueueOverlay keyboard reorder", () => {
  const onReorder = vi.fn();
  let mounted: ReturnType<typeof render>;

  function setup() {
    return render(
      <QueueOverlay
        queue={[makeItem("a", "Alpha"), makeItem("b", "Bravo"), makeItem("c", "Charlie")]}
        currentIndex={-1}
        accent="#ffffff"
        isOpen={true}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onPlayItem={vi.fn()}
        onReorder={onReorder}
      />,
    );
  }

  beforeEach(() => {
    onReorder.mockClear();
  });

  it("exposes grip handles to assistive tech", () => {
    mounted = setup();
    expect(screen.getAllByRole("button", { name: /^Reorder / })).toHaveLength(3);
  });

  it("moves an item down with ArrowDown", () => {
    mounted = setup();
    const grips = screen.getAllByRole("button", { name: /^Reorder / });
    fireEvent.keyDown(grips[0], { key: "ArrowDown" });
    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });

  it("moves an item up with ArrowUp", () => {
    mounted = setup();
    const grips = screen.getAllByRole("button", { name: /^Reorder / });
    fireEvent.keyDown(grips[2], { key: "ArrowUp" });
    expect(onReorder).toHaveBeenCalledWith(2, 1);
  });

  it("does nothing at the list boundaries", () => {
    mounted = setup();
    const grips = screen.getAllByRole("button", { name: /^Reorder / });
    fireEvent.keyDown(grips[0], { key: "ArrowUp" });
    fireEvent.keyDown(grips[2], { key: "ArrowDown" });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("announces the new position after a move", () => {
    mounted = setup();
    const grips = screen.getAllByRole("button", { name: /^Reorder / });
    fireEvent.keyDown(grips[1], { key: "ArrowUp" });
    expect(onReorder).toHaveBeenCalledWith(1, 0);
    expect(screen.getByText(/Bravo moved to position 1 of 3/)).toBeTruthy();
  });

  it("ignores unrelated keys", () => {
    mounted = setup();
    const grips = screen.getAllByRole("button", { name: /^Reorder / });
    fireEvent.keyDown(grips[0], { key: "Enter" });
    fireEvent.keyDown(grips[0], { key: "ArrowLeft" });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("renders the live region for announcements", () => {
    mounted = setup();
    expect(screen.getByRole("status")).toBeTruthy();
  });
});

describe("QueueOverlay play selection + keyboard isolation", () => {
  function setup() {
    return render(
      <QueueOverlay
        queue={[makeItem("a", "Alpha"), makeItem("b", "Bravo")]}
        currentIndex={0}
        accent="#ffffff"
        isOpen={true}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onPlayItem={vi.fn()}
      />,
    );
  }

  it("blurs the item button after selecting so a follow-up Space cannot re-trigger it", () => {
    const onPlayItem = vi.fn();
    render(
      <QueueOverlay
        queue={[makeItem("a", "Alpha")]}
        currentIndex={0}
        accent="#ffffff"
        isOpen={true}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onPlayItem={onPlayItem}
      />,
    );

    const playButton = screen.getByRole("button", { name: "Play Alpha" });
    playButton.focus();
    fireEvent.click(playButton);
    expect(onPlayItem).toHaveBeenCalledTimes(1);
    // Selection moves focus off the button.
    expect(document.activeElement).not.toBe(playButton);

    // A subsequent Space keydown (native reactivation path) must not fire
    // onPlayItem again.
    fireEvent.keyDown(playButton, { key: " " });
    expect(onPlayItem).toHaveBeenCalledTimes(1);
  });

  function mockAnimate(): ReturnType<typeof vi.fn> {
    const animate = vi.fn(() => ({ cancel: vi.fn(), finished: Promise.resolve() }));
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: animate,
      writable: true,
    });
    return animate;
  }

  it("never animates on initial mount while closed (no flash), even under double effect", () => {
    const animate = mockAnimate();

    render(
      <QueueOverlay
        queue={[makeItem("a", "Alpha"), makeItem("b", "Bravo")]}
        currentIndex={0}
        accent="#ffffff"
        isOpen={false}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onPlayItem={vi.fn()}
      />,
    );

    expect(animate).not.toHaveBeenCalled();
  });

  it("animates once when the overlay is actually opened", () => {
    const animate = mockAnimate();

    const { rerender } = render(
      <QueueOverlay
        queue={[makeItem("a", "Alpha"), makeItem("b", "Bravo")]}
        currentIndex={0}
        accent="#ffffff"
        isOpen={false}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onPlayItem={vi.fn()}
      />,
    );
    rerender(
      <QueueOverlay
        queue={[makeItem("a", "Alpha"), makeItem("b", "Bravo")]}
        currentIndex={0}
        accent="#ffffff"
        isOpen={true}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onPlayItem={vi.fn()}
      />,
    );

    expect(animate).toHaveBeenCalledTimes(2); // backdrop + panel
  });
});
