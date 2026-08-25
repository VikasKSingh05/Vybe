import { describe, it, expect, vi, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({ toast: vi.fn() }));
const toastMock = vi.mocked(toast);

interface FakeWorker {
  state: string;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
  setState(next: string): void;
}

function makeWorker(): FakeWorker {
  const listeners = new Set<() => void>();
  const worker: FakeWorker = {
    state: "installing",
    addEventListener(type, cb) {
      if (type === "statechange") listeners.add(cb);
    },
    removeEventListener() {},
    setState(next) {
      worker.state = next;
      listeners.forEach((cb) => cb());
    },
  };
  return worker;
}

interface RegistrationOptions {
  controller?: boolean;
  waiting?: FakeWorker | null;
  installing?: FakeWorker | null;
}

function makeRegistration({
  controller = false,
  waiting = null,
  installing = null,
}: RegistrationOptions = {}) {
  const updateListeners = new Set<() => void>();
  const registration = {
    installing,
    waiting,
    addEventListener(type: string, cb: () => void) {
      if (type === "updatefound") updateListeners.add(cb);
    },
    removeEventListener() {},
    emitUpdateFound() {
      updateListeners.forEach((cb) => cb());
    },
  };
  return registration;
}

function installServiceWorkerMock(registration: ReturnType<typeof makeRegistration>, hasController: boolean): void {
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      controller: hasController ? {} : null,
      register: vi.fn(() => Promise.resolve(registration)),
    },
  });
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("ServiceWorkerRegistrar", () => {
  afterEach(() => {
    Reflect.deleteProperty(window.navigator, "serviceWorker");
    Reflect.deleteProperty(window.navigator, "onLine");
    toastMock.mockClear();
  });

  it("does nothing when serviceWorker is unsupported", async () => {
    render(<ServiceWorkerRegistrar />);
    await flush();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("registers at root scope with no SW HTTP cache", async () => {
    const registration = makeRegistration();
    installServiceWorkerMock(registration, false);
    render(<ServiceWorkerRegistrar />);
    await flush();

    const sw = window.navigator.serviceWorker as unknown as {
      register: ReturnType<typeof vi.fn>;
    };
    expect(sw.register).toHaveBeenCalledTimes(1);
    const [scriptUrl, options] = sw.register.mock.calls[0] as unknown as [
      URL,
      { scope: string; updateViaCache: string },
    ];
    expect(scriptUrl.pathname).toContain("service-worker.js");
    expect(options).toEqual({ scope: "/", updateViaCache: "none" });
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("stays silent on a first-ever install (no previous controller)", async () => {
    const worker = makeWorker();
    worker.setState("installed");
    const registration = makeRegistration({ controller: false });
    installServiceWorkerMock(registration, false);
    render(<ServiceWorkerRegistrar />);
    await flush();

    registration.emitUpdateFound();
    await flush();

    expect(toastMock).not.toHaveBeenCalled();
  });

  it("announces an update already waiting at load time", async () => {
    const registration = makeRegistration({
      controller: true,
      waiting: makeWorker(),
    });
    installServiceWorkerMock(registration, true);
    render(<ServiceWorkerRegistrar />);
    await flush();

    expect(toastMock).toHaveBeenCalledWith(
      "New version ready — refresh to update",
      "info",
      12000,
    );
  });

  it("announces once when an update finishes installing mid-session", async () => {
    const worker = makeWorker();
    const registration = makeRegistration({ controller: true });
    installServiceWorkerMock(registration, true);
    render(<ServiceWorkerRegistrar />);
    await flush();

    // Browser discovers the new version
    act(() => {
      registration.installing = worker;
      registration.emitUpdateFound();
    });
    expect(toastMock).not.toHaveBeenCalled();

    // Install completes into the waiting phase
    act(() => {
      worker.setState("installed");
    });

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      "New version ready — refresh to update",
      "info",
      12000,
    );
  });

  it("toasts exactly once per offline period", async () => {
    setOnLine(false);
    render(<ServiceWorkerRegistrar />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      "You're offline — playback needs a connection",
      "error",
      6000,
    );

    // Staying offline must not nag again
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(toastMock).toHaveBeenCalledTimes(1);

    // Reconnect re-arms the notice for the next drop
    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(toastMock).toHaveBeenCalledTimes(2);
  });
});

function setOnLine(value: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}
