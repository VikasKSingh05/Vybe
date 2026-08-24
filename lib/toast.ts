export type ToastTone = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

type Listener = (toasts: ToastItem[]) => void;

const TOAST_LIMIT = 3;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit(): void {
  const snapshot = [...toasts];
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): ToastItem[] {
  return [...toasts];
}

export function toast(
  message: string,
  tone: ToastTone = "info",
  durationMs = 4000,
): number {
  if (!message.trim()) return -1;
  const id = nextId++;
  toasts =
    toasts.length >= TOAST_LIMIT
      ? [...toasts.slice(toasts.length - TOAST_LIMIT + 1), { id, message, tone }]
      : [...toasts, { id, message, tone }];
  emit();
  if (durationMs > 0 && typeof setTimeout !== "undefined") {
    setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
}

export function dismissToast(id: number): void {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Test helper — clears all state between tests. */
export function resetToasts(): void {
  toasts = [];
  nextId = 1;
}
