import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { LeaveModal } from "@/components/party/LeaveModal";

describe("LeaveModal", () => {
  let onStay: () => void;
  let onLeave: () => void;

  function setup() {
    onStay = vi.fn((): void => {});
    onLeave = vi.fn((): void => {});
    render(<LeaveModal onStay={onStay} onLeave={onLeave} />);
  }

  it("opens with focus on the Stay button", () => {
    setup();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Stay" }));
  });

  it("stays when the backdrop is clicked", () => {
    setup();
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("stays on Escape without letting it bubble further", () => {
    const bubbled = vi.fn();
    document.addEventListener("keydown", bubbled);
    setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
    document.removeEventListener("keydown", bubbled);
  });

  it("leaves via the Leave button", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onStay).not.toHaveBeenCalled();
  });

  it("wraps Tab from the last button back to the first", () => {
    setup();
    const stay = screen.getByRole("button", { name: "Stay" });
    const leave = screen.getByRole("button", { name: "Leave" });
    leave.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Tab",
      shiftKey: false,
    });
    expect(document.activeElement).toBe(stay);
  });

  it("wraps shift-Tab from the first button to the last", () => {
    setup();
    const stay = screen.getByRole("button", { name: "Stay" });
    const leave = screen.getByRole("button", { name: "Leave" });
    stay.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Tab",
      shiftKey: true,
    });
    expect(document.activeElement).toBe(leave);
  });

  it("restores focus to the previously active element on unmount", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(
      <LeaveModal onStay={vi.fn()} onLeave={vi.fn()} />,
    );
    unmount();

    expect(document.activeElement).toBe(trigger);
  });
});
