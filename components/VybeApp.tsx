"use client";

import { useCallback, useEffect, useState } from "react";
import type { Song } from "@/types/music";
import { Background } from "@/components/Background";
import { LandingReveal } from "@/components/LandingReveal";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import { GenrePills } from "@/components/GenrePills";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { QueueOverlay } from "@/components/QueueOverlay";
import { SearchOverlay } from "@/components/SearchOverlay";
import { SettingsOverlay } from "@/components/SettingsOverlay";
import { TrackAnnouncer } from "@/components/player/TrackAnnouncer";
import { usePlayer } from "@/hooks/usePlayer";
import { useSearch } from "@/hooks/useSearch";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";

export function VybeApp() {
  const player = usePlayer({ initialVibeId: "bollywood", autoPlay: false });
  const search = useSearch();

  const [queueOpen, setQueueOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      accent="#b06cff"
      onQueryChange={search.setQuery}
      onPlaySong={handlePlaySong}
      onAddToQueue={handleAddToQueue}
      onPlayNext={handlePlayNext}
      onSearchSubmit={search.search}
      history={search.history}
      onClearHistory={search.clearHistory}
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

  useKeyboardShortcuts({
    onTogglePlay: player.togglePlay,
    onSeek: (delta) =>
      player.seek(
        Math.min(Math.max(0, player.currentTime + delta), player.duration),
      ),
    onNext: player.next,
    onPrev: player.prev,
    onToggleMute: player.toggleMute,
  });

  return (
    <div className="relative min-h-dvh overflow-hidden text-white font-sans antialiased select-none">
      <Background theme={player.theme} />
      <LandingReveal accent={player.theme.accent} />
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
        onToggleSettings={() => setSettingsOpen((o) => !o)}
        className={cn(
          "transition-opacity duration-300",
          searchOpen && "opacity-0 pointer-events-none",
        )}
      />

      <SettingsOverlay
        isOpen={settingsOpen}
        accent={player.theme.accent}
        crossfadeEnabled={player.crossfadeEnabled}
        repeatMode={player.repeatMode}
        shuffle={player.shuffle}
        onClose={() => setSettingsOpen(false)}
        onToggleCrossfade={() => player.setCrossfadeEnabled(!player.crossfadeEnabled)}
        onRepeatModeChange={player.setRepeatMode}
        onToggleShuffle={player.toggleShuffle}
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
        onReorder={handleReorder}
      />

      <TrackAnnouncer title={player.track?.title} artist={player.track?.artist} />
    </div>
  );
}

export default VybeApp;
