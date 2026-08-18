"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Users, Link2, Sparkles } from "lucide-react";
import { backgroundThemes } from "@/data/backgrounds";

interface PartyLandingProps {
  initialRoomId?: string;
  error?: string;
  onCreate: (name: string, vibeId: string) => void;
  onJoin: (roomId: string, name: string) => void;
}

const ACCENT = backgroundThemes["all"].accent;

export function PartyLanding({
  initialRoomId,
  error,
  onCreate,
  onJoin,
}: PartyLandingProps) {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState(initialRoomId ?? "");
  const [submitting, setSubmitting] = useState<"create" | "join" | null>(null);

  const canSubmit = name.trim().length > 0;

  const handleCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || submitting) return;
      setSubmitting("create");
      onCreate(name.trim(), "all");
    },
    [canSubmit, name, submitting, onCreate],
  );

  const handleJoin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || submitting || roomId.trim().length < 4) return;
      setSubmitting("join");
      onJoin(roomId.trim().toLowerCase(), name.trim());
    },
    [canSubmit, name, roomId, submitting, onJoin],
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="fixed top-5 left-5 z-30 font-display text-sm font-semibold tracking-tight text-white/90 transition-colors duration-300 hover:text-white"
      >
        VYBE
      </Link>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] tracking-wide text-white/60">
            <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT }} />
            Live listening, together
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white">
            VYBE Party
          </h1>
          <p className="mt-3 text-sm text-white/50">
            Start a room, share the code, and listen in perfect sync with your crew.
          </p>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-[11px] tracking-wide text-white/40" htmlFor="party-name">
            YOUR NAME
          </label>
          <input
            id="party-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aarav"
            maxLength={24}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/30"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit || submitting !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            <Users className="h-4 w-4" />
            {submitting === "create" ? "Starting…" : "Host a party"}
          </button>

          <div className="flex items-center gap-3 text-[10px] tracking-widest text-white/30 uppercase">
            <span className="h-px flex-1 bg-white/10" />
            or join with a code
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm tracking-[0.3em] text-white placeholder-white/30 uppercase outline-none transition-colors focus:border-white/30"
            />
            <button
              type="submit"
              disabled={!canSubmit || submitting !== null || roomId.trim().length < 4}
              aria-label="Join party"
              className="flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-white transition-all duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Link2 className="h-4 w-4" />
            </button>
          </form>

          <p className="pt-1 text-center text-[11px] text-white/30">
            You can also join from your phone&apos;s browser.
          </p>
        </div>
      </div>
    </div>
  );
}
