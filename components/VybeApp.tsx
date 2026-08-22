"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Song } from "@/types/music";
import { Background } from "@/components/Background";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import { GenrePills } from "@/components/GenrePills";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { QueueOverlay } from "@/components/QueueOverlay";
import { SearchBar } from "@/components/SearchBar";
import { usePlayer } from "@/hooks/usePlayer";
import { useSearch } from "@/hooks/useSearch";
import { useDiscoveryQueue } from "@/hooks/useDiscoveryQueue";

export function VybeApp() {
  const player = usePlayer({ initialVibeId: "bollywood", autoPlay: false });
  const search = useSearch();

  const queueItemIds = useMemo(
    () => player.queueItems.map((item) => item.jiosaavnId ?? item.queueItemId),
    [player.queueItems],
  );

  useDiscoveryQueue({
    vibeId: player.vibeId,
    queueItemIds,
    addToQueue: player.addToQueue,
  });

  const [visibleError, setVisibleError] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);

  useEffect(() => {
    if (player.error) {
      setVisibleError(player.error);
      const timer = setTimeout(() => setVisibleError(null), 6_000);
      return () => clearTimeout(timer);
    } else {
      setVisibleError(null);
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
      player.addToQueue(songToEntry(song), song, true);
      search.clear();
    },
    [player, songToEntry, search],
  );

  const handleAddToQueue = useCallback(
    (song: Song) => {
      player.addToQueue(songToEntry(song), song);
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

  const handleVibeChange = useCallback(
    (id: Parameters<typeof player.changeVibe>[0]) => {
      player.changeVibe(id);
      search.clear();
      setQueueOpen(false);
    },
    [player, search],
  );

  const searchBar = (
    <SearchBar
      query={search.query}
      results={search.results}
      isSearching={search.isSearching}
      hasSearched={search.hasSearched}
      error={search.error}
      accent="#b06cff"
      onQueryChange={search.setQuery}
      onPlaySong={handlePlaySong}
      onAddToQueue={handleAddToQueue}
    />
  );

  return (
    <div className="relative min-h-dvh overflow-hidden text-white font-sans antialiased select-none">
      <Background theme={player.theme} />
      <Header />

      <main
        id="main-content"
        className="relative z-10 flex h-dvh flex-col items-center justify-center pb-44 sm:pb-48 md:pb-52"
      >
        <HeroSection />

        <div className="mt-8 sm:mt-10">
          <GenrePills
            activeId={player.vibeId}
            onChange={handleVibeChange}
            accent={player.theme.accent}
            searchBar={searchBar}
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
      />

      <QueueOverlay
        queue={player.queueItems}
        currentIndex={player.currentIndex}
        accent={player.theme.accent}
        isOpen={queueOpen}
        onClose={() => setQueueOpen(false)}
        onRemove={handleRemoveFromQueue}
        onPlayItem={handlePlayQueueItem}
      />

      {visibleError && (
        <div
          role="alert"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-300 backdrop-blur-md"
        >
          {player.error}
        </div>
      )}
    </div>
  );
}

export default VybeApp;
