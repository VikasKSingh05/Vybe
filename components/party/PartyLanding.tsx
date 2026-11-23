"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, Radio, RotateCcw, Users } from "lucide-react";
import { partyTheme } from "@/data/backgrounds";
import type { VibeId } from "@/data/types";
import { savePartyName, loadPartyName } from "@/lib/party/share";

interface RejoinIdentity {
  roomId: string;
  memberId: string;
  name: string;
}

interface PartyLandingProps {
  initialRoomId?: string;
  error?: string;
  /** Remembered identity from a dropped connection — enables one-click rejoin. */
  rejoinIdentity?: RejoinIdentity | null;
  onCreate: (name: string, vibeId: VibeId) => void;
  onJoin: (roomId: string, name: string, memberId?: string) => void;
}

const ACCENT = partyTheme.accent;

const INPUT_CLASS =
  "w-full rounded-xl border border-paper/12 bg-paper/[0.03] px-4 py-3.5 text-sm text-paper placeholder-paper/25 outline-none transition-colors focus:border-signal/60 focus-visible:ring-2 focus-visible:ring-signal/20";

export function PartyLanding({
  initialRoomId,
  error,
  rejoinIdentity,
  onCreate,
  onJoin,
}: PartyLandingProps) {
  // Seed from a remembered identity / stored name at mount time so the
  // deep-link auto-join below never needs a synchronous setState in an effect.
  const [name, setName] = useState(
    () => rejoinIdentity?.name ?? loadPartyName() ?? "",
  );
  const [roomId, setRoomId] = useState(
    () => rejoinIdentity?.roomId ?? initialRoomId ?? "",
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
      await onJoin(rejoinIdentity.roomId, rejoinIdentity.name, rejoinIdentity.memberId);
    } finally {
      setSubmitting(null);
    }
  }, [rejoinIdentity, submitting, onJoin]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-ink text-paper">
      <div className="grain-overlay pointer-events-none fixed inset-0 -z-10 opacity-[0.06]" />

      <Link
        href="/"
        className="mono-label fixed top-6 left-5 z-30 flex min-h-[44px] items-center gap-2 text-paper/45 transition-colors hover:text-paper sm:left-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        VYBE LIVE
      </Link>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pt-28 pb-16 sm:px-8 sm:pt-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:gap-16">
          <section className="animate-hero-in">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-signal" />
              <p className="mono-label text-paper/45">Private frequency / Jam</p>
            </div>

            <h1 className="font-display text-[clamp(3.5rem,12vw,7rem)] leading-[0.78] font-extrabold tracking-[-0.07em] text-paper">
              VYBE
              <br />
              JAM<span className="text-signal">.</span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-relaxed text-paper/55 sm:text-lg">
              One room. One queue. Everyone hears the same thing at the same
              time — and anyone can put a record on.
            </p>

            <div className="mt-9 flex max-w-lg flex-wrap gap-x-6 gap-y-3 border-t border-paper/10 pt-5">
              {["Shared playback", "Host controls", "Vote on tracks"].map((item) => (
                <span key={item} className="mono-label text-paper/35">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-paper/12 bg-ink/85 p-5 shadow-[0_28px_80px_-32px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:p-7">
            <div className="mb-7 flex items-center justify-between">
              <p className="mono-label text-paper/40">Room setup</p>
              <Radio className="h-4 w-4" style={{ color: ACCENT }} />
            </div>

            {rejoinIdentity && (
              <button
                type="button"
                onClick={handleQuickRejoin}
                disabled={submitting !== null}
                className="mb-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-signal/40 bg-signal/10 px-4 text-sm font-medium text-signal transition-colors hover:bg-signal/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" />
                {submitting === "join"
                  ? "Rejoining…"
                  : `Rejoin ${rejoinIdentity.roomId.toUpperCase()} as ${rejoinIdentity.name}`}
              </button>
            )}

            <div className="mb-5">
              <label className="mono-label mb-2 block text-paper/40" htmlFor="party-name">
                Your name
              </label>
              <input
                id="party-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (triedSubmit) setTriedSubmit(false);
                }}
                placeholder="e.g. Aarav"
                maxLength={24}
                className={INPUT_CLASS}
              />
              {showNameHint && (
                <p className="mt-1.5 text-xs text-signal">
                  Enter your name to continue.
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate || submitting !== null}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 font-display text-sm font-bold text-ink transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Users className="h-4 w-4" />
              {submitting === "create" ? "Starting…" : "Create a room"}
            </button>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-paper/10" />
              <span className="mono-label text-paper/30">or join a room</span>
              <span className="h-px flex-1 bg-paper/10" />
            </div>

            <form onSubmit={handleJoin} className="space-y-3">
              <label className="mono-label block text-paper/40" htmlFor="room-code">
                Room code
              </label>
              <input
                id="room-code"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={6}
                className={`${INPUT_CLASS} text-center font-mono text-base tracking-[0.3em] uppercase`}
              />
              {showCodeHint && (
                <p className="text-xs text-paper/40">At least 4 characters.</p>
              )}
              <button
                type="submit"
                disabled={!canJoin || submitting !== null}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-paper/15 bg-paper/[0.03] px-4 text-sm font-medium text-paper/80 transition-colors hover:border-signal/40 hover:bg-signal/[0.06] hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Link2 className="h-4 w-4" />
                {submitting === "join" ? "Joining…" : "Join room"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-paper/30">
              Share the room code with anyone you want in the room.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
