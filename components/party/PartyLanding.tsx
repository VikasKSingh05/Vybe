"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Users, Link2, Sparkles, RotateCcw } from "lucide-react";
import { partyTheme } from "@/data/backgrounds";
import type { VibeId } from "@/data/types";
import { savePartyName, loadPartyName } from "@/lib/party/share";

interface RejoinIdentity {
  roomId: string;
  name: string;
}

interface PartyLandingProps {
  initialRoomId?: string;
  error?: string;
  /** Remembered identity from a dropped connection — enables one-click rejoin. */
  rejoinIdentity?: RejoinIdentity | null;
  onCreate: (name: string, vibeId: VibeId) => void;
  onJoin: (roomId: string, name: string) => void;
}

const ACCENT = partyTheme.accent;

export function PartyLanding({
  initialRoomId,
  error,
  rejoinIdentity,
  onCreate,
  onJoin,
}: PartyLandingProps) {
  const [name, setName] = useState(rejoinIdentity?.name ?? "");
  const [roomId, setRoomId] = useState(
    rejoinIdentity?.roomId ?? initialRoomId ?? "",
  );
  const [submitting, setSubmitting] = useState<"create" | "join" | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const autoJoinAttemptedRef = useRef(false);

  // Auto-join from deep link if we have a stored name
  useEffect(() => {
    if (autoJoinAttemptedRef.current) return;
    if (!initialRoomId) return;
    const storedName = loadPartyName();
    if (!storedName) return;
    autoJoinAttemptedRef.current = true;
    setName(storedName);
    setRoomId(initialRoomId);
    const timer = setTimeout(() => {
      setSubmitting("join");
      onJoin(initialRoomId, storedName);
    }, 300);
    return () => clearTimeout(timer);
  }, [initialRoomId, onJoin]);

  const canCreate = name.trim().length > 0;
  const canJoin = name.trim().length > 0 && roomId.trim().length >= 4;
  const showNameHint = triedSubmit && name.trim().length === 0;
  const showCodeHint = roomId.length > 0 && roomId.length < 4;

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setTriedSubmit(true);
      if (!canCreate || submitting) return;
      setSubmitting("create");
      try {
        savePartyName(name.trim());
        await onCreate(name.trim(), "bollywood");
      } finally {
        setSubmitting(null);
      }
    },
    [canCreate, name, submitting, onCreate],
  );

  const handleJoin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setTriedSubmit(true);
      if (!canJoin || submitting) return;
      setSubmitting("join");
      try {
        savePartyName(name.trim());
        await onJoin(roomId.trim().toLowerCase(), name.trim());
      } finally {
        setSubmitting(null);
      }
    },
    [canJoin, name, roomId, submitting, onJoin],
  );

  const handleQuickRejoin = useCallback(async () => {
    if (!rejoinIdentity || submitting) return;
    setSubmitting("join");
    try {
      savePartyName(rejoinIdentity.name);
      await onJoin(rejoinIdentity.roomId, rejoinIdentity.name);
    } finally {
      setSubmitting(null);
    }
  }, [rejoinIdentity, submitting, onJoin]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 pb-[env(safe-area-inset-bottom)]">
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

        {rejoinIdentity && (
          <button
            type="button"
            onClick={handleQuickRejoin}
            disabled={submitting !== null}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 hover:brightness-125 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            style={{
              borderColor: `${ACCENT}55`,
              backgroundColor: `${ACCENT}1f`,
              color: ACCENT,
            }}
          >
            <RotateCcw className="h-4 w-4" />
            {submitting === "join"
              ? "Rejoining…"
              : `Rejoin room ${rejoinIdentity.roomId.toUpperCase()} as ${rejoinIdentity.name}`}
          </button>
        )}

        <div className="mb-5">
          <label className="mb-2 block text-[11px] tracking-wide text-white/40" htmlFor="party-name">
            YOUR NAME
          </label>
          <input
            id="party-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); if (triedSubmit) setTriedSubmit(false); }}
            placeholder="e.g. Aarav"
            maxLength={24}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/30 focus-visible:ring-2 focus-visible:ring-white/40"
          />
          {showNameHint && (
            <p className="mt-1.5 text-[11px] text-amber-400/80">
              Enter your name to continue
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate || submitting !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-black transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            <Users className="h-4 w-4" />
            {submitting === "create" ? "Starting…" : "Create a Room"}
          </button>

          <div className="flex items-center gap-3 text-[10px] tracking-widest text-white/30 uppercase">
            <span className="h-px flex-1 bg-white/10" />
            or join an existing room
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleJoin} className="space-y-2">
            <label className="mb-1 block text-[11px] tracking-wide text-white/40" htmlFor="room-code">
              ROOM CODE
            </label>
            <input
              id="room-code"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Paste or type a code"
              maxLength={6}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm tracking-[0.3em] text-white placeholder-white/30 uppercase outline-none transition-colors focus:border-white/30 focus-visible:ring-2 focus-visible:ring-white/40"
            />
            {showCodeHint && (
              <p className="text-[11px] text-white/40">
                At least 4 characters
              </p>
            )}
            <button
              type="submit"
              disabled={!canJoin || submitting !== null}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm font-medium text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Link2 className="h-4 w-4" />
              {submitting === "join" ? "Joining…" : "Join Room"}
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
