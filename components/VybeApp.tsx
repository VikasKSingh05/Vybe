"use client";

import { CinematicBackground } from "@/components/CinematicBackground";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import { GenrePills } from "@/components/GenrePills";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { NowPlayingBadge } from "@/components/NowPlayingBadge";
import { usePlayer } from "@/hooks/usePlayer";

export function VybeApp() {
  const player = usePlayer({ initialVibeId: "all", autoPlay: true });

  return (
    <div className="relative min-h-dvh overflow-hidden text-white">
      <CinematicBackground theme={player.theme} />

      <Header />

      <main className="relative z-10 flex min-h-dvh flex-col pb-44 md:pb-48">
        <HeroSection />

        <GenrePills
          activeId={player.vibeId}
          onChange={player.changeVibe}
          accent={player.theme.accent}
        />

        <NowPlayingBadge
          title={player.track.title}
          artist={player.track.artist}
          isPlaying={player.isPlaying}
          accent={player.theme.accent}
          trackKey={`${player.vibeId}-${player.track.id}`}
          className="mt-auto"
        />
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
        onTogglePlay={player.togglePlay}
        onPrev={player.prev}
        onNext={player.next}
        onSeek={player.seek}
        onVolumeChange={player.changeVolume}
        onToggleMute={player.toggleMute}
      />
    </div>
  );
}
