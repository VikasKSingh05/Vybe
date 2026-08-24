export type ToastTone = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  durationMs: number;
}

type Listener = (toasts: ToastItem[]) => void;

const TOAST_LIMIT = 3;
const DEFAULT_DURATION_MS = 4000;

interface TimerRecord {
  timeout: ReturnType<typeof setTimeout>;
  endsAt: number;
  remainingMs: number;
  paused: boolean;
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, TimerRecord>();

function emit(): void {
  const snapshot = [...toasts];
  listeners.forEach((listener) => listener(snapshot));
}

function clearTimer(id: number): void {
  const record = timers.get(id);
  if (record) {
    clearTimeout(record.timeout);
    timers.delete(id);
  }
}

function armTimer(id: number, durationMs: number): void {
  clearTimer(id);
  timers.set(id, {
    timeout: setTimeout(() => dismissToast(id), durationMs),
    endsAt: Date.now() + durationMs,
    remainingMs: durationMs,
    paused: false,
  });
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
  durationMs = DEFAULT_DURATION_MS,
): number {
  if (!message.trim()) return -1;
  const id = nextId++;

  // Evict the oldest beyond the limit, cleaning up their timers
  const overflow = toasts.length - TOAST_LIMIT + 1;
  if (overflow > 0) {
    for (const evicted of toasts.slice(0, overflow)) clearTimer(evicted.id);
    toasts = toasts.slice(overflow);
  }

  toasts = [...toasts, { id, message, tone, durationMs }];
  emit();
  if (durationMs > 0 && typeof setTimeout !== "undefined") {
    armTimer(id, durationMs);
  }
  return id;
}

export function dismissToast(id: number): void {
  if (!toasts.some((t) => t.id === id)) return;
  clearTimer(id);
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Freezes a toast's countdown (e.g. while hovered). */
export function pauseToast(id: number): void {
  const record = timers.get(id);
  if (!record || record.paused) return;
  clearTimeout(record.timeout);
  record.remainingMs = Math.max(0, record.endsAt - Date.now());
  record.paused = true;
}

/** Resumes a paused countdown from where it left off. */
export function resumeToast(id: number): void {
  const record = timers.get(id);
  if (!record || !record.paused) return;
  if (record.remainingMs <= 0) {
    dismissToast(id);
    return;
  }
  record.endsAt = Date.now() + record.remainingMs;
  record.timeout = setTimeout(() => dismissToast(id), record.remainingMs);
  record.paused = false;
}

/** Test helper — clears all state between tests. */
export function resetToasts(): void {
  for (const id of [...timers.keys()]) clearTimer(id);
  toasts = [];
  nextId = 1;
}
