"use client";

import { Background } from "@/components/Background";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import { GenrePills } from "@/components/GenrePills";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { usePlayer } from "@/hooks/usePlayer";

export function VybeApp() {
  const player = usePlayer({ initialVibeId: "all", autoPlay: false });

  return (
    <div className="relative min-h-dvh overflow-hidden text-white font-sans antialiased select-none">
      {/* 100vh Full Screen Cinematic Background with GSAP transitions */}
      <Background theme={player.theme} />

      {/* Top Header Bar */}
      <Header />

      {/* Main Single Page Content */}
      <main className="relative z-10 flex h-dvh flex-col items-center">
        {/* Center Editorial Hero — flex-1 pushes it toward the center */}
        <div className="flex flex-1 items-end">
          <HeroSection vibeLabel={player.theme.label} />
        </div>

        {/* Genre Selector Pills — sits naturally below the hero, above the player */}
        <div className="pb-48 sm:pb-52 md:pb-56 pt-2">
          <GenrePills
            activeId={player.vibeId}
            onChange={player.changeVibe}
            accent={player.theme.accent}
          />
        </div>
      </main>

      {/* Translucent Floating Music Player */}
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

export default VybeApp;
