interface TrackInfoProps {
  title: string;
  artist: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TrackInfo({ title, artist, size = "md", className }: TrackInfoProps) {
  return (
    <div className={className}>
      <p
        className={`truncate font-semibold tracking-tight text-white/95 ${
          size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-sm"
        }`}
      >
        {title}
      </p>
      <p
        className={`truncate text-white/55 ${
          size === "lg" ? "mt-1 text-sm" : size === "sm" ? "mt-0.5 text-[11px]" : "mt-0.5 text-xs"
        }`}
      >
        {artist}
      </p>
    </div>
  );
}
