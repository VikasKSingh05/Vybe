"use client";

import { useCallback, useEffect, useState } from "react";
import type { Song } from "@/types/music";
import { Background } from "@/components/Background";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import { GenrePills } from "@/components/GenrePills";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { QueueOverlay } from "@/components/QueueOverlay";
import { SearchOverlay } from "@/components/SearchOverlay";
import { usePlayer } from "@/hooks/usePlayer";
import { useSearch } from "@/hooks/useSearch";
import { useMediaSession } from "@/hooks/useMediaSession";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

export function VybeApp() {
  const player = usePlayer({ initialVibeId: "bollywood", autoPlay: false });
  const search = useSearch();

  const [queueOpen, setQueueOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (player.error) {
      toast(player.error, "error");
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

  const handleClearQueue = useCallback(() => {
    player.clearCustomQueue();
  }, [player]);

  const searchOverlay = (
    <SearchOverlay
      query={search.query}
      results={search.results}
      isSearching={search.isSearching}
      hasSearched={search.hasSearched}
      error={search.error}
      accent="#b06cff"
      onQueryChange={search.setQuery}
      onPlaySong={handlePlaySong}
      onAddToQueue={handleAddToQueue}
      onOpenChange={setSearchOpen}
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

  return (
    <div className="relative min-h-dvh overflow-hidden text-white font-sans antialiased select-none">
      <Background theme={player.theme} />
      <Header />

      <main
        id="main-content"
        className="relative z-10 flex h-dvh flex-col items-center overflow-y-auto pb-44 sm:pb-48 md:pb-52"
      >
        <div className="my-auto flex w-full flex-col items-center">
          <HeroSection />

          <div className="mt-8 shrink-0 sm:mt-10">
            <GenrePills
              activeId={player.vibeId}
              onChange={handleVibeChange}
              accent={player.theme.accent}
              searchOverlay={searchOverlay}
            />
          </div>
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
        onClear={player.isRandomMode ? handleClearQueue : undefined}
      />
    </div>
  );
}

export default VybeApp;
