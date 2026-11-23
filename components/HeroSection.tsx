import { Radio } from "lucide-react";
import type { VibeTheme } from "@/data/types";

interface HeroSectionProps {
  theme: VibeTheme;
}

export function HeroSection({ theme }: HeroSectionProps) {
  return (
    <header className="flex min-h-0 flex-col items-center justify-center gap-5 px-4 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_36px_rgba(176,108,255,0.24)] backdrop-blur-md"
        style={{ color: theme.accent }}
      >
        <Radio className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <p
          className="text-[11px] font-semibold tracking-[0.42em] uppercase"
          style={{ color: theme.accent }}
        >
          VYBE LIVE
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          One station. Everyone, in sync.
        </h1>
        <p className="mx-auto max-w-md text-balance text-sm leading-relaxed text-white/50">
          A single global broadcast that keeps playing — no genres to choose,
          no stations to switch.
        </p>
      </div>
    </header>
  );
}
