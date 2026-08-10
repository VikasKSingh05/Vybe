"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { LiveTime } from "@/components/LiveTime";
import { cn } from "@/lib/cn";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;

    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" },
    );
  }, []);

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6 select-none",
        className,
      )}
    >
      {/* Top Left: Logo */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-bold tracking-[0.35em] text-white/80 uppercase hover:text-white transition-colors duration-300">
          VYBE
        </span>
      </div>

      {/* Top Right: Time + External Links */}
      <div className="flex items-center gap-5 sm:gap-6">
        <LiveTime />

        <nav className="flex items-center gap-4 sm:gap-5">
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 text-[11px] tracking-wide text-white/50 transition-colors duration-300 hover:text-white/90"
          >
            Spotify
            <span className="text-[10px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              ↗
            </span>
          </a>
          <a
            href="https://music.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 text-[11px] tracking-wide text-white/50 transition-colors duration-300 hover:text-white/90"
          >
            YouTube Music
            <span className="text-[10px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              ↗
            </span>
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
