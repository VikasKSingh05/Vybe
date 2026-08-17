"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, LogOut, Music2, Radio, Users } from "lucide-react";
import type { Track } from "@/data/types";
import { getVibeTheme } from "@/data/vibes";
import { Background } from "@/components/Background";
import { Header } from "@/components/Header";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import { usePartyAudio } from "@/hooks/usePartyAudio";
import type { useParty } from "@/hooks/useParty";
import { PartyQueue } from "./PartyQueue";
import { PartyAddSong } from "./PartyAddSong";
import { PartyMembers } from "./PartyMembers";
import { PartyReactions } from "./PartyReactions";

interface PartyRoomProps {
  party: ReturnType<typeof useParty>;
}

export function PartyRoom({ party }: PartyRoomProps) {
  const { state, member, isHost, send, leaveParty } = party;
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const theme = getVibeTheme(state?.vibeId ?? "all");

  const onTrackEnded = useCallback(() => {
    if (isHost) send("next");
  }, [isHost, send]);

  const audio = usePartyAudio({ state, onTrackEnded });

  const currentQueueTrack = state?.playback?.queueId
    ? state.queue.find((t) => t.queueId === state.playback?.queueId)
    : null;

  const hasQueue = (state?.queue.length ?? 0) > 0;
  const isUpNext = !currentQueueTrack && hasQueue;
  const displayTrack = currentQueueTrack ?? (state?.queue[0] ?? null);

  const playerTrack: Track | null = displayTrack
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
    : null;

  const playerDuration =
    audio.duration > 0 ? audio.duration : (playerTrack?.duration ?? 0);

  const handleCopy = useCallback(async () => {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(state.roomId.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }, [state]);

  const handleSeek = useCallback(
    (seconds: number) => {
      if (isHost) send("seek", { seconds });
    },
    [isHost, send],
  );

  const confirmLeave = useCallback(() => {
    setShowLeaveConfirm(false);
    leaveParty();
    router.push("/");
  }, [leaveParty, router]);

  return (
    <div className="relative h-dvh flex flex-col overflow-hidden text-white font-sans antialiased select-none">
      <Background theme={theme} />
      <Header inParty onExitParty={() => setShowLeaveConfirm(true)} />

      <main className="relative z-10 mx-auto flex min-h-0 flex-1 w-full max-w-5xl flex-col gap-6 overflow-hidden px-4 pt-24 pb-48 sm:px-6 md:pb-56">
        {/* Room header row */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl shadow-lg"
              style={{ backgroundColor: theme.accent, boxShadow: `0 8px 24px ${theme.accent}44` }}
            >
              <Radio className="h-5 w-5 text-black" />
            </div>
            <div>
              <p className="text-[10px] tracking-widest text-white/40 uppercase">
                Room code
              </p>
              <p className="font-mono text-2xl font-semibold tracking-[0.25em] text-white">
                {state?.roomId.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/50">
              <Users className="h-3.5 w-3.5" style={{ color: theme.accent }} />
              {state?.members.length ?? 0}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/50">
              <Music2 className="h-3.5 w-3.5" style={{ color: theme.accent }} />
              {state?.queue.length ?? 0}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" style={{ color: theme.accent }} />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy code"}
            </button>
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-3.5 py-2 text-[11px] text-red-300 transition-colors hover:bg-red-400/20 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Leave
            </button>
          </div>
        </section>

        {/* Main grid */}
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-0 min-w-0 flex-col gap-6">
            <PartyQueue
              className="flex-1 min-h-0"
              state={state}
              isHost={isHost}
              accent={theme.accent}
              memberId={member?.id ?? ""}
              onRemove={(queueId) => send("removeTrack", { queueId })}
            />

            <PartyAddSong
              accent={theme.accent}
              onAdd={(song) => send("addTrack", { song })}
            />
          </section>

          <aside className="flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto">
            <PartyMembers
              members={state?.members ?? []}
              hostId={state?.hostId ?? ""}
              meId={member?.id ?? ""}
              accent={theme.accent}
            />
          </aside>
        </div>
      </main>

      {playerTrack && (
        <FloatingPlayer
          track={playerTrack}
          isPlaying={audio.isPlaying}
          currentTime={audio.currentTime}
          duration={playerDuration}
          progress={playerDuration > 0 ? (audio.currentTime / playerDuration) * 100 : 0}
          volume={audio.volume}
          isMuted={audio.isMuted}
          accent={theme.accent}
          locked={!isHost}
          onTogglePlay={() => {
            if (isHost) send(audio.isPlaying ? "pause" : "play");
          }}
          onPrev={() => isHost && send("prev")}
          onNext={() => isHost && send("next")}
          onSeek={handleSeek}
          onVolumeChange={audio.setVolume}
          onToggleMute={audio.toggleMute}
        />
      )}

      <PartyReactions
        accent={theme.accent}
        disabled={!state}
        reactions={state?.reactions ?? []}
        onReact={(emoji) => send("reaction", { emoji })}
      />

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111]/95 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-400/10">
              <LogOut className="h-5 w-5 text-red-300" />
            </div>
            <h3 className="text-lg font-semibold text-white">Leave the party?</h3>
            <p className="mt-2 text-sm text-white/50">
              You&apos;ll give up your spot and return to VYBE.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={confirmLeave}
                className="flex-1 rounded-xl bg-red-400/90 px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-red-400 cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
