import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlayer } from "@/hooks/usePlayer";
import { getPlaylistForGenre } from "@/data/playlists";

interface MockAudio {
  _src: string;
  src: string;
  preload: string;
  readyState: number;
  currentTime: number;
  volume: number;
  error: { code: number } | null;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  setAttribute: ReturnType<typeof vi.fn>;
  getAttribute: ReturnType<typeof vi.fn>;
  removeAttribute: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  fire: (type: string) => void;
  listeners: Map<string, ((e?: unknown) => void)[]>;
}

function makeAudio(): MockAudio {
  const el = {
    _src: "",
    src: "",
    preload: "auto",
    readyState: 0,
    currentTime: 0,
    volume: 1,
    error: null,
    listeners: new Map<string, ((e?: unknown) => void)[]>(),
    play: vi.fn().mockImplementation(() => Promise.resolve()),
    pause: vi.fn(),
    load: vi.fn(),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(() => null),
    removeAttribute: vi.fn(),
    addEventListener: vi.fn(function (
      this: MockAudio,
      type: string,
      fn: (e?: unknown) => void,
    ) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
    }),
    removeEventListener: vi.fn(),
    fire(this: MockAudio, type: string) {
      (this.listeners.get(type) ?? []).forEach((fn) => fn?.());
    },
  } as MockAudio;
  Object.defineProperty(el, "src", {
    get(this: MockAudio) {
      return this._src;
    },
    set(this: MockAudio, v: string) {
      this._src = v;
    },
    configurable: true,
  });
  return el;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  streamUrl: string;
  artwork: string;
  duration: number;
}

const ALL_PLAYLISTS = [
  ...getPlaylistForGenre("bollywood"),
  ...getPlaylistForGenre("lofi"),
  ...getPlaylistForGenre("indie"),
];

function songFor(title: string): Song {
  return {
    id: title,
    title,
    artist: `${title} Artist`,
    streamUrl: `https://audio.test/${encodeURIComponent(title)}.mp3`,
    artwork: `/covers/${title}.jpg`,
    duration: 180,
  };
}

function firstSongUrl(vibe: "bollywood" | "lofi" | "indie"): string {
  return songFor(getPlaylistForGenre(vibe)[0].title).streamUrl;
}

function findSong(url: string): Song {
  const queryMatch = url.match(/query=([^&]*)/);
  const decoded = queryMatch ? decodeURIComponent(queryMatch[1]) : "";
  const entry = ALL_PLAYLISTS.find((e) =>
    `${e.title} ${e.artist}`.startsWith(decoded),
  );
  return songFor(entry?.title ?? "default");
}

let audioInstances: MockAudio[] = [];
let originalAudio: typeof Audio;
let originalFetch: typeof fetch;

// Per-test hook to gate a specific request (returns a promise to defer).
let gate: ((url: string) => Promise<Song> | null) | undefined;

function primary(): MockAudio {
  return audioInstances[0];
}
function secondary(): MockAudio {
  return audioInstances[1];
}
function playableSrcs(): string[] {
  return audioInstances
    .filter((el) => el.play.mock.calls.length > 0 && el.src)
    .map((el) => el.src);
}
function waitFor(fn: () => boolean, timeout = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      try {
        if (fn()) return resolve();
      } catch {}
      if (Date.now() - start > timeout) return reject(new Error("waitFor timeout"));
      setTimeout(tick, 5);
    };
    tick();
  });
}

function responseFor(song: Song): Response {
  return { ok: true, json: async () => song } as unknown as Response;
}

describe("usePlayer vibe-switch single-audio invariant", () => {
  beforeAll(() => {
    originalAudio = globalThis.Audio;
    originalFetch = globalThis.fetch;
  });

  beforeEach(() => {
    window.localStorage.clear();
    audioInstances = [];
    globalThis.Audio = class {
      constructor() {
        const el = makeAudio();
        audioInstances.push(el);
        return el;
      }
    } as unknown as typeof Audio;

    gate = undefined;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (gate) {
        const gated = await gate(url);
        if (gated) return responseFor(gated);
      }
      return responseFor(findSong(url));
    });
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
    globalThis.fetch = originalFetch;
    audioInstances = [];
  });

  function setup() {
    // autoPlay:true sets userInteracted=true from the start, so playAtIndex/
    // changeVibe autoplay engages deterministically in the test environment.
    return renderHook(() =>
      usePlayer({ initialVibeId: "bollywood", autoPlay: true }),
    );
  }

  async function playFirstSong(host: ReturnType<typeof setup>) {
    const r = host.result;
    act(() => {
      r.current.setCrossfadeEnabled(false);
      r.current.playAtIndex(0);
    });
    await act(async () => {
      await waitFor(() => primary().play.mock.calls.length > 0);
    });
  }

  it("switching vibe while playing stops the old source and plays only the new one", async () => {
    const host = setup();
    await playFirstSong(host);

    primary().pause.mockClear();
    secondary().pause.mockClear();
    secondary().removeAttribute.mockClear();
    primary().play.mockClear();
    secondary().play.mockClear();

    act(() => {
      host.result.current.changeVibe("lofi");
    });
    await act(async () => {
      await waitFor(() =>
        playableSrcs().some((s) => s === firstSongUrl("lofi")),
      );
    });

    // Old source stopped on every surface.
    expect(primary().pause).toHaveBeenCalled();
    expect(secondary().pause).toHaveBeenCalled();
    // Exactly one source is playing: the new vibe's first song.
    expect(playableSrcs()).toEqual([firstSongUrl("lofi")]);
    expect(host.result.current.vibeId).toBe("lofi");
  });

  it("a superseded async load from the previous vibe cannot start playing", async () => {
    const host = setup();
    await playFirstSong(host);

    const staleTitle = getPlaylistForGenre("bollywood")[1].title;

    // Gate the fetch for song[1] of vibe A so it stays pending.
    let resolveStale!: (song: Song) => void;
    const staleGate = new Promise<Song>((r) => (resolveStale = r));
    gate = (url) => {
      if (url.includes(encodeURIComponent(staleTitle))) return staleGate;
      return null;
    };

    act(() => {
      host.result.current.next(); // async load of staleTitle, held by the gate
    });
    await act(async () => {
      await Promise.resolve();
    });

    primary().play.mockClear();
    secondary().play.mockClear();

    // Switch to vibe B before the stale A load resolves.
    act(() => {
      host.result.current.changeVibe("lofi");
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    await waitFor(() =>
      playableSrcs().some((s) => s === firstSongUrl("lofi")),
    );

    // Resolve the stale A request AFTER B is active.
    await act(async () => {
      resolveStale(songFor(staleTitle));
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 50));
    });

    // The stale A song must never play: only B remains active.
    expect(host.result.current.vibeId).toBe("lofi");
    const playing = playableSrcs();
    expect(playing).toEqual([firstSongUrl("lofi")]);
    expect(playing[0]).not.toContain(staleTitle);
  });

  it("rapid A -> B -> C leaves only C playing", async () => {
    const host = setup();
    await playFirstSong(host);

    primary().play.mockClear();
    secondary().play.mockClear();

    act(() => {
      host.result.current.changeVibe("lofi");
      host.result.current.changeVibe("indie");
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });

    expect(host.result.current.vibeId).toBe("indie");
    const playing = playableSrcs();
    expect(playing).toEqual([firstSongUrl("indie")]);
  });
});
