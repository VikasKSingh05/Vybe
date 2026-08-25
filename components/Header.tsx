"use client";

import Link from "next/link";
import { LiveTime } from "@/components/LiveTime";
import { InstallButton } from "@/components/pwa/InstallButton";
import { cn } from "@/lib/cn";

interface HeaderProps {
  className?: string;
  /** When inside a party room, swap the "Host Party" link for an "Exit Party" action. */
  inParty?: boolean;
  onExitParty?: () => void;
}

export function Header({ className, inParty = false, onExitParty }: HeaderProps) {
  return (
    <header
      className={cn(
        "animate-header-in fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6",
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
            className="flex min-h-[44px] items-center gap-1 px-1 text-[11px] tracking-wide text-white/50 transition-colors duration-300 hover:text-white/90 cursor-pointer"
          >
            Exit Party
          </button>
        ) : (
          <Link
            href="/party"
            className="group flex min-h-[44px] items-center gap-1 px-1 text-[11px] tracking-wide text-white/50 transition-colors duration-300 hover:text-white/90"
          >
            Host Party
          </Link>
        )}
        <InstallButton />
      </nav>
    </header>
  );
}

export default Header;
