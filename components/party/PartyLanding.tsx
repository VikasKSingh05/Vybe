"use client";

import { useCallback, useState } from "react";
import { Users, Link2, Sparkles } from "lucide-react";
import type { VibeId } from "@/data/types";
import { backgroundThemes } from "@/data/backgrounds";
import { cn } from "@/lib/cn";

interface PartyLandingProps {
  initialRoomId?: string;
  error?: string;
  onCreate: (name: string, vibeId: VibeId) => void;
  onJoin: (roomId: string, name: string) => void;
}

const VIBE_IDS: VibeId[] = ["all", "phonk", "lofi", "bollywood", "indie", "chill"];

export function PartyLanding({
  initialRoomId,
  error,
  onCreate,
  onJoin,
}: PartyLandingProps) {
  const [name, setName] = useState("");
  const [vibeId, setVibeId] = useState<VibeId>("all");
  const [roomId, setRoomId] = useState(initialRoomId ?? "");
  const [submitting, setSubmitting] = useState<"create" | "join" | null>(null);

  const canSubmit = name.trim().length > 0;

  const handleCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || submitting) return;
      setSubmitting("create");
      onCreate(name.trim(), vibeId);
    },
    [canSubmit, name, vibeId, submitting, onCreate],
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
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] tracking-wide text-white/60">
            <Sparkles className="h-3.5 w-3.5" style={{ color: backgroundThemes[vibeId].accent }} />
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

        <div className="mb-8">
          <label className="mb-2 block text-[11px] tracking-wide text-white/40">
            VIBE
          </label>
          <div className="flex flex-wrap gap-2">
            {VIBE_IDS.map((id) => {
              const theme = backgroundThemes[id];
              const selected = vibeId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVibeId(id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer",
                    selected
                      ? "border-transparent text-black"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white/90",
                  )}
                  style={selected ? { backgroundColor: theme.accent } : undefined}
                >
                  {theme.label}
                </button>
              );
            })}
          </div>
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
            style={{ backgroundColor: backgroundThemes[vibeId].accent }}
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
