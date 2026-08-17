"use client";

interface EqualizerProps {
  isPlaying: boolean;
  accent: string;
  className?: string;
}

export function Equalizer({ isPlaying, accent, className }: EqualizerProps) {
  return (
    <div
      className={`flex items-end gap-[3px] h-5 ${className ?? ""}`}
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-colors ${
            isPlaying ? "eq-bar" : ""
          }`}
          style={{
            height: isPlaying ? undefined : "4px",
            backgroundColor: accent,
            opacity: isPlaying ? 0.8 : 0.3,
          }}
        />
      ))}
    </div>
  );
}
