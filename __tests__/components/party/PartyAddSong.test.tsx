import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { PartyAddSong } from "@/components/party/PartyAddSong";
import type { Song } from "@/types/music";

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    className,
  }: {
    src?: string;
    alt?: string;
    className?: string;
  }) => <img src={src ?? ""} alt={alt ?? ""} className={className} />,
}));

vi.mock("@/lib/toast", () => ({
  toast: vi.fn(),
}));

import { toast } from "@/lib/toast";

function makeSong(id: string, title: string): Song {
  return {
    id,
    title,
    artist: `${title} Artist`,
    album: `${title} Album`,
    artwork: "",
    duration: 200,
    provider: "jiosaavn",
  };
}

type FetchHandler = {
  query: string;
  resolve: (payload: { ok?: boolean; songs?: Song[] }) => void;
};

function stubDeferredFetch() {
  const handlers: FetchHandler[] = [];
  const fetchMock = vi.fn(
    (_url: string) =>
      new Promise((resolve) => {
        const query = decodeURIComponent(_url.split("query=")[1] ?? "");
        handlers.push({
          query,
          resolve: (payload) =>
            resolve({
              ok: payload.ok ?? true,
              json: () => Promise.resolve({ songs: payload.songs ?? [] }),
            }),
        });
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return { handlers, fetchMock };
}

async function flush() {
  await act(async () => {});
}

let fetcher: ReturnType<typeof stubDeferredFetch>;

async function typeAndSearch(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(450);
  });
}

function resolveFetch(
  handler: FetchHandler | undefined,
  payload: { ok?: boolean; songs?: Song[] },
) {
  return act(async () => {
    handler?.resolve(payload);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("PartyAddSong search", () => {
  function setup(queuedIds?: Set<string>, onAdd = vi.fn(async () => true)) {
    render(
      <PartyAddSong
        accent="#f97316"
        queuedIds={queuedIds}
        onAdd={onAdd}
      />,
    );
    const input = screen.getByLabelText(/search for songs/i);
    return { input, onAdd };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    fetcher = stubDeferredFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not fetch while the debounce window is running", async () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "arijit" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(fetcher.fetchMock).not.toHaveBeenCalled();
  });

  it("fetches once after the debounce settles and renders results", async () => {
    const { input } = setup();
    await typeAndSearch(input, "arijit");
    expect(fetcher.fetchMock).toHaveBeenCalledTimes(1);
    expect(fetcher.fetchMock.mock.calls[0][0]).toContain("query=arijit");

    await resolveFetch(fetcher.handlers[0], {
      songs: [makeSong("1", "Tum Hi Ho")],
    });
    expect(screen.getByText("Tum Hi Ho")).toBeTruthy();
  });

  it("discards a stale response when a newer query superseded it", async () => {
    const { input } = setup();
    await typeAndSearch(input, "old");
    await typeAndSearch(input, "new");
    expect(fetcher.fetchMock).toHaveBeenCalledTimes(2);

    await resolveFetch(fetcher.handlers[0], {
      songs: [makeSong("stale", "Stale Song")],
    });
    await resolveFetch(fetcher.handlers[1], {
      songs: [makeSong("fresh", "Fresh Song")],
    });

    expect(screen.getByText("Fresh Song")).toBeTruthy();
    expect(screen.queryByText("Stale Song")).toBeNull();
  });

  it("shows an error message when the request fails", async () => {
    const { input } = setup();
    await typeAndSearch(input, "boom");
    await resolveFetch(fetcher.handlers[0], { ok: false });
    expect(screen.getByText("Search failed")).toBeTruthy();
  });
});

describe("PartyAddSong duplicates and adding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetcher = stubDeferredFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  async function searchAndShow(song: Song, queuedIds?: Set<string>) {
    const onAdd = vi.fn(async () => true);
    render(
      <PartyAddSong accent="#f97316" queuedIds={queuedIds} onAdd={onAdd} />,
    );
    const input = screen.getByLabelText(/search for songs/i);
    await typeAndSearch(input, "anything");
    await resolveFetch(fetcher.handlers[0], { songs: [song] });
    return { onAdd, input };
  }

  it("disables already-queued songs as 'In queue'", async () => {
    const song = makeSong("q1", "Queued Hit");
    await searchAndShow(song, new Set(["q1"]));
    const btn = screen.getByRole("button", { name: /in queue/i });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("closes the dropdown on a successful add, then shows 'Added' on reopen before reverting", async () => {
    const song = makeSong("a1", "Added Hit");
    const { onAdd, input } = await searchAndShow(song);

    fireEvent.click(screen.getByRole("button", { name: /add$/i }));
    expect(onAdd).toHaveBeenCalledWith(song);
    await flush();
    expect(screen.queryByText("Added Hit")).toBeNull();

    fireEvent.focus(input);
    const addedBtn = screen.getByRole("button", { name: /^added$/i });
    expect(addedBtn.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole("button", { name: /^add$/i })).toBeTruthy();
  });

  it("flags a failed add, surfaces an error toast, and recovers after 3s", async () => {
    const song = makeSong("f1", "Failing Hit");
    const failing = vi.fn(async () => false);
    render(
      <PartyAddSong accent="#f97316" queuedIds={undefined} onAdd={failing} />,
    );
    const input = screen.getByLabelText(/search for songs/i);
    await typeAndSearch(input, "anything");
    await resolveFetch(fetcher.handlers[0], { songs: [song] });

    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    await flush();

    expect(toast).toHaveBeenCalledWith(
      "Couldn't add that song. Please try again.",
      "error",
    );
    const failedBtn = screen.getByRole("button", { name: /^failed$/i });
    expect(failedBtn.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByRole("button", { name: /^add$/i })).toBeTruthy();
  });

  it("closes the dropdown when clicking outside", async () => {
    const song = makeSong("o1", "Outside Hit");
    await searchAndShow(song);
    expect(screen.getByText("Outside Hit")).toBeTruthy();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Outside Hit")).toBeNull();
  });

  it("clear button empties the query and hides the dropdown", async () => {
    const song = makeSong("c1", "Clearable Hit");
    await searchAndShow(song);
    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    expect(screen.queryByText("Clearable Hit")).toBeNull();
    expect((screen.getByLabelText(/search for songs/i) as HTMLInputElement).value).toBe("");
  });
});
