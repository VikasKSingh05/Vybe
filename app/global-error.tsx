"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

interface GlobalErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function GlobalError({ error, retry }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[VYBE] Global error:", error);
  }, [error]);

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${syne.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        {/* Renders its own document — keep styling self-contained */}
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
          <div className="w-full max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-white">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-white/50">
              VYBE hit an unexpected error and couldn&apos;t recover.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-6 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20 cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
