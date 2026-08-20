"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { LiveTime } from "@/components/LiveTime";
import { cn } from "@/lib/cn";

interface HeaderProps {
  className?: string;
  /** When inside a party room, swap the "Host Party" link for an "Exit Party" action. */
  inParty?: boolean;
  onExitParty?: () => void;
}

export function Header({ className, inParty = false, onExitParty }: HeaderProps) {
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
        "fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6",
        className,
      )}
    >
      {/* Top Left: Live Time */}
      <div className="flex items-center">
        <LiveTime />
      </div>

      {/* Top Right: External Links */}
      <nav className="flex items-center gap-4 sm:gap-5">
        {inParty ? (
          <button
            type="button"
            onClick={onExitParty}
            className="flex items-center gap-1 text-[11px] tracking-wide text-white/50 transition-colors duration-300 hover:text-white/90 cursor-pointer"
          >
            Exit Party
          </button>
        ) : (
          <Link
            href="/party"
            className="group flex items-center gap-1 text-[11px] tracking-wide text-white/50 transition-colors duration-300 hover:text-white/90"
          >
            Host Party
          </Link>
        )}
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
    </header>
  );
}

export default Header;
