"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LiveTime } from "@/components/LiveTime";
import { InstallButton } from "@/components/pwa/InstallButton";
import { cn } from "@/lib/cn";

interface HeaderProps {
  className?: string;
  /** When inside a party room, swap the "Jam" link for an "Exit Jam" action. */
  inParty?: boolean;
  onExitParty?: () => void;
}

export function Header({ className, inParty = false, onExitParty }: HeaderProps) {
  return (
    <header
      className={cn(
        "animate-header-in fixed inset-x-0 top-0 z-30 px-5 pt-5 sm:px-8 sm:pt-7",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="group flex items-center" aria-label="VYBE home">
          <span className="font-display text-lg font-extrabold tracking-[0.28em] text-paper transition-colors group-hover:text-white">
            VYBE
          </span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:block">
            <LiveTime />
          </div>

          {inParty ? (
            <button
              type="button"
              onClick={onExitParty}
              className="mono-label flex min-h-[44px] items-center text-paper/50 transition-colors hover:text-paper"
            >
              Exit Jam
            </button>
          ) : (
            <Link
              href="/party"
              className="mono-label group flex min-h-[44px] items-center gap-1.5 text-paper/55 transition-colors hover:text-paper"
            >
              Jam
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          )}
          <InstallButton />
        </nav>
      </div>
    </header>
  );
}

export default Header;
