import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { SearchOverlay } from "@/components/SearchOverlay";
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

function makeSong(id: string, title: string): Song {
  return {
    id,
    title,
    artist: `${title} Artist`,
    album: `${title} Album`,
    artwork: "",
    duration: 210,
    provider: "jiosaavn",
  };
}

// Reduced motion makes open/close synchronous — no GSAP timeline waits.
function stubMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("SearchOverlay actions", () => {
  let handlers: {
    onQueryChange: (query: string) => void;
    onPlaySong: (song: Song) => void;
    onAddToQueue: (song: Song) => void;
    onPlayNext: (song: Song) => void;
  };

  function renderWith(songs: Song[], opts: { noPlayNext?: boolean } = {}) {
    handlers = {
      onQueryChange: vi.fn((_q: string) => {}),
      onPlaySong: vi.fn((_s: Song) => {}),
      onAddToQueue: vi.fn((_s: Song) => {}),
      onPlayNext: vi.fn((_s: Song) => {}),
    };
    const { onPlayNext, ...rest } = handlers;
    render(
      <SearchOverlay
        query=""
        results={songs}
        isSearching={false}
        hasSearched={!songs.length ? false : true}
        error={null}
        accent="#f97316"
        {...(opts.noPlayNext ? rest : handlers)}
      />,
    );
  }

  function openOverlay(songs: Song[] = []) {
    renderWith(songs);
    fireEvent.click(screen.getByRole("button", { name: /search for songs/i }));
  }

  beforeEach(() => {
    stubMatchMedia();
  });

  it("opens the dialog and focuses the input", () => {
    openOverlay();
    expect(screen.getByRole("dialog", { name: "Search songs" })).toBeTruthy();
    expect(document.activeElement?.tagName).toBe("INPUT");
  });

  it("play action plays the song and closes the overlay", () => {
    const song = makeSong("1", "Tum Hi Ho");
    openOverlay([song]);
    fireEvent.click(screen.getByRole("button", { name: "Play Tum Hi Ho" }));
    expect(handlers.onPlaySong).toHaveBeenCalledWith(song);
    expect(handlers.onQueryChange).toHaveBeenCalledWith("");
    expect(document.activeElement?.tagName).toBe("BUTTON");
  });

  it("queue action queues the song and closes the overlay", () => {
    const song = makeSong("2", "Chaiyya Chaiyya");
    openOverlay([song]);
    fireEvent.click(
      screen.getByRole("button", { name: "Add Chaiyya Chaiyya to queue" }),
    );
    expect(handlers.onAddToQueue).toHaveBeenCalledWith(song);
    expect(handlers.onQueryChange).toHaveBeenCalledWith("");
  });

  it("play-next action plays the song next and closes the overlay", () => {
    const song = makeSong("3", "Kun Faya Kun");
    openOverlay([song]);
    fireEvent.click(
      screen.getByRole("button", { name: "Play Kun Faya Kun next" }),
    );
    expect(handlers.onPlayNext).toHaveBeenCalledWith(song);
    expect(handlers.onQueryChange).toHaveBeenCalledWith("");
  });

  it("hides the play-next button when no handler is provided", () => {
    renderWith([makeSong("4", "Breathless")], { noPlayNext: true });
    fireEvent.click(screen.getByRole("button", { name: /search for songs/i }));
    expect(
      screen.queryByRole("button", { name: "Play Breathless next" }),
    ).toBeNull();
  });

  it("escape closes the overlay and restores focus to the trigger", () => {
    openOverlay();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handlers.onQueryChange).toHaveBeenCalledWith("");
    expect(document.activeElement?.tagName).toBe("BUTTON");
  });
});

describe("SearchOverlay recent panel", () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  function renderHistory(history: string[], extra: Record<string, unknown> = {}) {
    const onSearchSubmit = vi.fn();
    const onClearHistory = vi.fn();
    render(
      <SearchOverlay
        query=""
        results={[]}
        isSearching={false}
        hasSearched={false}
        error={null}
        accent="#f97316"
        history={history}
        onQueryChange={vi.fn()}
        onPlaySong={vi.fn()}
        onAddToQueue={vi.fn()}
        onSearchSubmit={onSearchSubmit}
        onClearHistory={onClearHistory}
        {...extra}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /search for songs/i }));
    return { onSearchSubmit, onClearHistory };
  }

  it("lists recent searches before any search has run", () => {
    renderHistory(["arijit singh", "the weeknd"]);
    expect(screen.getByText("arijit singh")).toBeTruthy();
    expect(screen.getByText("the weeknd")).toBeTruthy();
  });

  it("clicking a recent search submits that query", () => {
    const { onSearchSubmit } = renderHistory(["arijit singh"]);
    fireEvent.click(screen.getByRole("button", { name: /arijit singh/i }));
    expect(onSearchSubmit).toHaveBeenCalledWith("arijit singh");
  });

  it("clear button wipes history via callback", () => {
    const { onClearHistory } = renderHistory(["shreya"]);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClearHistory).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state when there is no history", () => {
    renderHistory([]);
    expect(screen.getByText(/type to search millions of songs/i)).toBeTruthy();
  });

  it("hides recents once a real search has happened", () => {
    renderHistory(["old query"], { hasSearched: true, results: [] });
    expect(screen.queryByText("Recent")).toBeNull();
    expect(screen.getByText(/no results found/i)).toBeTruthy();
  });
});
