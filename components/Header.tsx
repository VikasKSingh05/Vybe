import { LiveTime } from "@/components/LiveTime";
import { cn } from "@/lib/cn";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-5 py-5 md:px-8 md:py-6",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-medium tracking-[0.35em] text-white/70 uppercase">
          VYBE
        </span>
      </div>

      <div className="flex items-center gap-5 md:gap-6">
        <LiveTime />

        <nav className="flex items-center gap-4 md:gap-5">
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 text-[11px] tracking-wide text-white/45 transition-colors duration-300 hover:text-white/80"
          >
            Spotify
            <span className="text-[10px] transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px">
              ↗
            </span>
          </a>
          <a
            href="https://music.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 text-[11px] tracking-wide text-white/45 transition-colors duration-300 hover:text-white/80"
          >
            YouTube Music
            <span className="text-[10px] transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px">
              ↗
            </span>
          </a>
        </nav>
      </div>
    </header>
  );
}
