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
        className={`truncate font-display font-bold tracking-tight text-paper ${
          size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base"
        }`}
      >
        {title}
      </p>
      <p
        className={`truncate text-paper/50 ${
          size === "lg" ? "mt-1 text-sm" : size === "sm" ? "mt-0.5 text-[11px]" : "mt-0.5 text-xs"
        }`}
      >
        {artist}
      </p>
    </div>
  );
}
