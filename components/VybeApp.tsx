"use client";

import { useCallback, useEffect, useState } from "react";
import type { Song } from "@/types/music";
import { Background } from "@/components/Background";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { LiveStationPanel } from "@/components/LiveStationPanel";
import { QueueOverlay } from "@/components/QueueOverlay";
import { SearchOverlay } from "@/components/SearchOverlay";
import { TrackAnnouncer } from "@/components/player/TrackAnnouncer";
import { usePlayer } from "@/hooks/usePlayer";
import { useSearch } from "@/hooks/useSearch";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

export function VybeApp() {
  const player = usePlayer({ autoPlay: false });
  const search = useSearch();

  const [queueOpen, setQueueOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (player.error) {
      toast(`Playback error: ${player.error}`, "error");
    }
  }, [player.error]);

  const songToEntry = useCallback(
    (song: Song) => ({
      jiosaavnId: song.id,
      title: song.title,
      artist: song.artist,
      artwork: song.artwork,
      duration: song.duration,
    }),
    [],
  );

  const handlePlaySong = useCallback(
    (song: Song) => {
      const added = player.addToQueue(songToEntry(song), song, true);
      if (added) toast(`Playing · ${song.title}`, "success");
      else toast(`"${song.title}" is already in the queue`, "info");
      search.clear();
    },
    [player, songToEntry, search],
  );

  const handleAddToQueue = useCallback(
    (song: Song) => {
      const added = player.addToQueue(songToEntry(song), song);
      if (added) toast(`Queued · ${song.title}`, "success");
      else toast(`"${song.title}" is already in the queue`, "info");
      search.clear();
    },
    [player, songToEntry, search],
  );

  const handlePlayNext = useCallback(
    (song: Song) => {
      const added = player.playNextInQueue(songToEntry(song), song);
      if (added) toast(`Playing next · ${song.title}`, "success");
      else toast(`"${song.title}" is already in the queue`, "info");
      search.clear();
    },
    [player, songToEntry, search],
  );

  const handlePlayQueueItem = useCallback(
    (index: number) => {
      player.playAtIndex(index);
    },
    [player],
  );

  const handleRemoveFromQueue = useCallback(
    (index: number) => {
      player.removeFromQueue(index);
    },
    [player],
  );

  const handleClearQueue = useCallback(() => {
    player.clearCustomQueue();
  }, [player]);

  const handleReorder = useCallback(
    (from: number, to: number) => {
      player.reorderQueue(from, to);
    },
    [player],
  );

  const searchOverlay = (
    <SearchOverlay
      query={search.query}
      results={search.results}
      isSearching={search.isSearching}
      hasSearched={search.hasSearched}
      error={search.error}
      accent={player.theme.accent}
      onQueryChange={search.setQuery}
      onPlaySong={handlePlaySong}
      onAddToQueue={handleAddToQueue}
      onPlayNext={handlePlayNext}
      onSearchSubmit={search.search}
      history={search.history}
      onClearHistory={search.clearHistory}
      onOpenChange={(open) => {
        setSearchOpen(open);
        if (!open) search.clear();
      }}
    />
  );

  useMediaSession({
    title: player.track.title,
    artist: player.track.artist,
    artwork: player.track.cover,
    isPlaying: player.isPlaying,
    duration: player.duration,
    currentTime: player.currentTime,
    onPlay: player.play,
    onPause: player.pause,
    onNext: player.next,
    onPrev: player.prev,
    onSeek: player.seek,
  });

  useKeyboardShortcuts(
    {
      onTogglePlay: player.togglePlay,
      onSeek: (delta) =>
        player.seek(
          Math.min(Math.max(0, player.currentTime + delta), player.duration),
        ),
      onNext: player.next,
      onPrev: player.prev,
      onToggleMute: player.toggleMute,
    },
    !queueOpen && !searchOpen,
  );

  return (
    <div className="relative h-dvh overflow-hidden bg-ink font-sans text-paper antialiased select-none">
      <Background theme={player.theme} />
      <Header />

      <main
        id="main-content"
        className="scrollbar-hide relative z-10 h-full overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto w-full max-w-6xl px-5 pt-24 pb-40 sm:px-8 sm:pt-28 sm:pb-44">
          <HeroSection />
          <LiveStationPanel
            track={player.track}
            status={player.stationStatus}
            isSyncing={player.isStationSyncing}
            hasCurrentTrack={player.hasCurrentTrack}
            queue={player.queueItems}
            accent={player.theme.accent}
            searchOverlay={searchOverlay}
            onRetry={() => void player.refreshWire()}
          />
        </div>
      </main>

      <FloatingPlayer
        track={player.track}
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={player.duration}
        progress={player.progress}
        volume={player.volume}
        isMuted={player.isMuted}
        accent={player.theme.accent}
        queueCount={player.queueLength}
        onTogglePlay={player.togglePlay}
        onPrev={player.prev}
        onNext={player.next}
        onSeek={player.seek}
        onVolumeChange={player.changeVolume}
        onToggleMute={player.toggleMute}
        onToggleQueue={() => setQueueOpen((o) => !o)}
        className={cn(
          "transition-opacity duration-300",
          searchOpen && "opacity-0 pointer-events-none",
        )}
      />

      <QueueOverlay
        queue={player.queueItems}
        currentIndex={player.currentIndex}
        accent={player.theme.accent}
        isOpen={queueOpen}
        onClose={() => setQueueOpen(false)}
        onRemove={handleRemoveFromQueue}
        onPlayItem={handlePlayQueueItem}
        onClear={handleClearQueue}
        onReorder={handleReorder}
      />

      <TrackAnnouncer title={player.track?.title} artist={player.track?.artist} />
    </div>
  );
}

export default VybeApp;
