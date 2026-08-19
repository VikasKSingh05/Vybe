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
      <main className="relative z-10 flex h-dvh flex-col items-center justify-center pb-44 sm:pb-48 md:pb-52">
        {/* Editorial Hero */}
        <HeroSection />

        {/* Genre Selector Pills */}
        <div className="mt-8 sm:mt-10">
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

      {player.error && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-300 backdrop-blur-md">
          {player.error}
        </div>
      )}
    </div>
  );
}

export default VybeApp;
