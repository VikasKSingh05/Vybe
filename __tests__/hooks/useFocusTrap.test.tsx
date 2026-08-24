import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

function Harness({ open }: { open: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap({ containerRef, active: open });
  return (
    <div>
      <button data-testid="outside">Outside</button>
      <div ref={containerRef} data-testid="container">
        <button data-testid="first">First</button>
        <button data-testid="middle">Middle</button>
        <button data-testid="last">Last</button>
      </div>
    </div>
  );
}

function activeElement(): HTMLElement {
  return document.activeElement as HTMLElement;
}

describe("useFocusTrap", () => {
  it("focuses the first focusable element on activation", () => {
    const mounted = render(<Harness open={false} />);
    mounted.rerender(<Harness open={true} />);
    expect(activeElement()).toBe(mounted.getByTestId("first"));
  });

  it("wraps Tab from the last element back to the first", () => {
    const mounted = render(<Harness open={false} />);
    mounted.rerender(<Harness open={true} />);
    mounted.getByTestId("last").focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(activeElement()).toBe(mounted.getByTestId("first"));
  });

  it("wraps Shift+Tab from the first element back to the last", () => {
    const mounted = render(<Harness open={false} />);
    mounted.rerender(<Harness open={true} />);
    mounted.getByTestId("first").focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(activeElement()).toBe(mounted.getByTestId("last"));
  });

  it("does not intercept Tab between interior elements", () => {
    const mounted = render(<Harness open={false} />);
    mounted.rerender(<Harness open={true} />);
    mounted.getByTestId("first").focus();
    // jsdom performs no native focus traversal, so assert the trap leaves
    // the default action intact rather than checking where focus landed.
    const defaultNotPrevented = fireEvent.keyDown(
      mounted.getByTestId("first"),
      { key: "Tab" },
    );
    expect(defaultNotPrevented).toBe(true);
  });

  it("restores focus to the previously-focused element on deactivation", () => {
    const mounted = render(<Harness open={false} />);
    const outside = mounted.getByTestId("outside");
    outside.focus();
    mounted.rerender(<Harness open={true} />);
    expect(activeElement()).not.toBe(outside);
    mounted.rerender(<Harness open={false} />);
    expect(activeElement()).toBe(outside);
  });
});
