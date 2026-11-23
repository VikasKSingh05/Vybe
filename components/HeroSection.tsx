import type { VibeTheme } from "@/data/types";

interface HeroSectionProps {
  theme: VibeTheme;
}

export function HeroSection({ theme }: HeroSectionProps) {
  return (
    <section className="animate-hero-in flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-px w-8 bg-signal" />
          <p className="mono-label text-paper/45">Global broadcast / 001</p>
        </div>
        <h1 className="font-display text-[clamp(3.6rem,13vw,8.5rem)] leading-[0.78] font-extrabold tracking-[-0.07em] text-paper">
          VYBE
          <span className="text-signal">.</span>
          <br className="hidden sm:block" />
          <span className="sm:pl-[0.08em]">LIVE</span>
        </h1>
      </div>

      <div className="max-w-xs sm:pb-2 sm:text-right">
        <p className="font-display text-xl leading-tight tracking-tight text-paper sm:text-2xl">
          One station.
          <br />
          Everyone, in sync.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-paper/50">
          A single global frequency. No genres, no filters — just what the room
          is hearing right now.
        </p>
        <p
          className="mono-label mt-5 flex items-center gap-2 sm:justify-end"
          style={{ color: theme.accent }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" />
          On air
        </p>
      </div>
    </section>
  );
}
