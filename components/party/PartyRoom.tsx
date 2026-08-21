"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, WifiOff, RefreshCw } from "lucide-react";
import gsap from "gsap";
import type { Track, VibeId } from "@/data/types";
import { getVibeTheme } from "@/data/vibes";
import { PARTY_VIBES } from "@/lib/party/types";
import { Background } from "@/components/Background";
import { usePartyAudio } from "@/hooks/usePartyAudio";
import { usePartyActivity } from "@/hooks/usePartyActivity";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { useParty } from "@/hooks/useParty";
import { PartyTopNav } from "./PartyTopNav";
import { RoomCodeCard } from "./RoomCodeCard";
import { NowPlayingCard } from "./NowPlayingCard";
import { PartyQueue } from "./PartyQueue";
import { PartyAddSong } from "./PartyAddSong";
import { PartyMembers } from "./PartyMembers";
import { ActivityFeed } from "./ActivityFeed";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface PartyRoomProps {
  party: ReturnType<typeof useParty>;
}

interface LeaveModalProps {
  onStay: () => void;
  onLeave: () => void;
}

function LeaveModal({ onStay, onLeave }: LeaveModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stayRef.current?.focus();
    const prev = document.activeElement as HTMLElement | null;

    if (dialogRef.current) {
      gsap.fromTo(dialogRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: "power2.out" });
    }
    if (backdropRef.current) {
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
    }

    return () => prev?.focus();
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onStay();
        return;
      }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [onStay]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onStay}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111]/95 p-6 text-center shadow-2xl"
      >
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-400/10">
          <LogOut className="h-5 w-5 text-red-300" />
        </div>
        <h3 id="leave-dialog-title" className="text-lg font-semibold text-white">
          Leave the party?
        </h3>
        <p className="mt-2 text-sm text-white/50">
          You&apos;ll give up your spot and return to VYBE.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            ref={stayRef}
            type="button"
            onClick={onStay}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 cursor-pointer"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 rounded-xl bg-red-400/90 px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-red-400 cursor-pointer"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

export function PartyRoom({ party }: PartyRoomProps) {
  const { state, member, isHost, send, leaveParty, status, error: partyError } = party;
  const router = useRouter();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { copy } = useCopyToClipboard();

  const theme = getVibeTheme(state?.vibeId ?? "all");

  const onTrackEnded = useCallback(() => {
    if (isHost) send("next");
  }, [isHost, send]);

  const audio = usePartyAudio({ state, onTrackEnded });
  const activities = usePartyActivity(state);

  const currentQueueTrack = useMemo(
    () => state?.playback?.queueId
      ? state.queue.find((t) => t.queueId === state.playback?.queueId)
      : null,
    [state?.playback?.queueId, state?.queue],
  );

  const hasQueue = (state?.queue.length ?? 0) > 0;
  const isUpNext = !currentQueueTrack && hasQueue;
  const displayTrack = currentQueueTrack ?? (state?.queue[0] ?? null);

  const playerTrack: Track | null = useMemo(
    () => displayTrack
      ? {
          id: displayTrack.queueId,
          title: displayTrack.song.title,
          artist: isUpNext
            ? `Up next — ${displayTrack.song.artist}`
            : displayTrack.song.artist,
          duration: displayTrack.song.duration ?? 0,
          cover: displayTrack.song.artwork,
          streamUrl: displayTrack.song.streamUrl,
          accent: theme.accent,
        }
      : null,
    [displayTrack, isUpNext, theme.accent],
  );

  const playerDuration = useMemo(
    () => audio.duration > 0 ? audio.duration : (playerTrack?.duration ?? 0),
    [audio.duration, playerTrack?.duration],
  );

  const handleSeek = useCallback(
    (seconds: number) => {
      if (isHost) send("seek", { seconds });
    },
    [isHost, send],
  );

  const handlePlayTrack = useCallback(
    (queueId: string) => {
      if (isHost) send("playTrack", { queueId });
    },
    [isHost, send],
  );

  const confirmLeave = useCallback(() => {
    setShowLeaveConfirm(false);
    leaveParty();
    router.push("/party");
  }, [leaveParty, router]);

  const handleTogglePlay = useCallback(() => {
    if (isHost) send(audio.isPlaying ? "pause" : "play");
  }, [isHost, send, audio.isPlaying]);

  const handlePrev = useCallback(() => { if (isHost) send("prev"); }, [isHost, send]);
  const handleNext = useCallback(() => { if (isHost) send("next"); }, [isHost, send]);
  const handleReact = useCallback((emoji: string) => send("reaction", { emoji }), [send]);
  const handleRemove = useCallback((queueId: string) => send("removeTrack", { queueId }), [send]);

  const VIBE_CYCLE = useMemo(() => PARTY_VIBES as readonly VibeId[], []);
  const handleSetVibe = useCallback(() => {
    if (!isHost || !state) return;
    const idx = VIBE_CYCLE.indexOf(state.vibeId);
    const next = VIBE_CYCLE[(idx + 1) % VIBE_CYCLE.length];
    send("setVibe", { vibeId: next });
  }, [isHost, state?.vibeId, send, VIBE_CYCLE]);

  const handleClearQueue = useCallback(() => {
    if (!isHost) return;
    setShowClearConfirm(true);
  }, [isHost]);

  const confirmClearQueue = useCallback(() => {
    setShowClearConfirm(false);
    send("clearQueue");
  }, [send]);

  const handleInvite = useCallback(() => {
    if (!state) return;
    copy(`${window.location.origin}/party/${state.roomId}`);
  }, [state?.roomId, copy]);

  return (
    <div className="relative h-dvh flex flex-col overflow-hidden text-white font-sans antialiased">
      <Background theme={theme} />

      {(status === "closed" || status === "reconnecting") && (
        <div role="alert" className="fixed inset-x-0 top-[52px] z-40 flex items-center justify-center gap-3 bg-black/80 px-4 py-3 text-sm backdrop-blur-sm">
          {status === "closed" ? (
            <>
              <WifiOff className="h-4 w-4 text-red-300" />
              <span className="text-white/70">{partyError ?? "Connection lost"}</span>
              <button
                type="button"
                onClick={leaveParty}
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/15 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Rejoin
              </button>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
              <span className="text-white/70">Reconnecting…</span>
            </>
          )}
        </div>
      )}

      <PartyTopNav
        roomId={state?.roomId ?? ""}
        memberCount={state?.members.length ?? 0}
        queueCount={state?.queue.length ?? 0}
        accent={theme.accent}
        onLeave={() => setShowLeaveConfirm(true)}
      />

      {/* Viewport-locked content area */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col px-4 sm:px-5 lg:px-6 pt-[52px] pb-4">

        {/* ─── BENTO GRID — single row, three columns ─── */}
        <div className="flex-1 min-h-0 grid gap-4 lg:gap-5 grid-cols-1 lg:grid-cols-[280px_1fr_260px]">

          {/* LEFT — Room + Host Controls (full height) */}
          <div className="min-h-0 overflow-y-auto scrollbar-hide">
            <RoomCodeCard
              roomId={state?.roomId ?? ""}
              isHost={isHost}
              accent={theme.accent}
              isPlaying={audio.isPlaying}
              volume={audio.volume}
              isMuted={audio.isMuted}
              vibeId={state?.vibeId ?? "all"}
              onTogglePlay={handleTogglePlay}
              onPrev={handlePrev}
              onNext={handleNext}
              onVolumeChange={audio.setVolume}
              onToggleMute={audio.toggleMute}
              onSetVibe={handleSetVibe}
              onClearQueue={handleClearQueue}
            />
          </div>

          {/* CENTER — Now Playing + Queue */}
          <div className="flex flex-col gap-3 min-h-0">
            <NowPlayingCard
              track={playerTrack}
              state={state}
              isPlaying={audio.isPlaying}
              currentTime={audio.currentTime}
              duration={playerDuration}
              progress={playerDuration > 0 ? (audio.currentTime / playerDuration) * 100 : 0}
              isHost={isHost}
              accent={theme.accent}
              onTogglePlay={handleTogglePlay}
              onPrev={handlePrev}
              onNext={handleNext}
              onSeek={handleSeek}
              onReact={handleReact}
            />

            <PartyQueue
              className="flex-1 min-h-0"
              state={state}
              isHost={isHost}
              accent={theme.accent}
              memberId={member?.id ?? ""}
              onRemove={handleRemove}
              onPlayTrack={handlePlayTrack}
            />
          </div>

          {/* RIGHT — Members + Activity */}
          <div className="flex flex-col gap-2 min-h-0 overflow-hidden">
            <div className="flex-none">
              <PartyMembers
                members={state?.members ?? []}
                hostId={state?.hostId ?? ""}
                meId={member?.id ?? ""}
                accent={theme.accent}
                onInvite={handleInvite}
              />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              <ActivityFeed
                activities={activities}
              />
            </div>
          </div>
        </div>

        {/* ─── SEARCH BAR — centered floating bento card ─── */}
        <div className="shrink-0 flex justify-center pt-3 lg:pt-4">
          <div className="w-full max-w-lg">
            <PartyAddSong
              accent={theme.accent}
              onAdd={(song) => send("addTrack", { song })}
            />
          </div>
        </div>
      </div>

      {/* Leave confirm modal */}
      {showLeaveConfirm && (
        <LeaveModal onStay={() => setShowLeaveConfirm(false)} onLeave={confirmLeave} />
      )}

      {/* Clear queue confirm modal */}
      <ConfirmDialog
        open={showClearConfirm}
        title="Clear queue?"
        message="All tracks will be removed from the queue."
        confirmLabel="Clear"
        onConfirm={confirmClearQueue}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
