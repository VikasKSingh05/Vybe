"use client";

import { useCallback, useState } from "react";
import { Copy, Check, LogOut, Radio, Users } from "lucide-react";
import type { Track, VibeId } from "@/data/types";
import { getVibeTheme } from "@/data/vibes";
import { backgroundThemes } from "@/data/backgrounds";
import { Background } from "@/components/Background";
import { Header } from "@/components/Header";
import { FloatingPlayer } from "@/components/FloatingPlayer";
import { usePartyAudio } from "@/hooks/usePartyAudio";
import type { useParty } from "@/hooks/useParty";
import { cn } from "@/lib/cn";
import { PartyQueue } from "./PartyQueue";
import { PartyAddSong } from "./PartyAddSong";
import { PartyMembers } from "./PartyMembers";
import { PartyReactions } from "./PartyReactions";

const VIBE_IDS: VibeId[] = ["all", "phonk", "lofi", "bollywood", "indie", "chill"];

interface PartyRoomProps {
  party: ReturnType<typeof useParty>;
}

export function PartyRoom({ party }: PartyRoomProps) {
  const { state, member, isHost, send, leaveParty } = party;
  const [copied, setCopied] = useState(false);

  const theme = getVibeTheme(state?.vibeId ?? "all");

  const onTrackEnded = useCallback(() => {
    if (isHost) send("next");
  }, [isHost, send]);

  const audio = usePartyAudio({ state, onTrackEnded });

  const currentQueueTrack = state?.playback?.queueId
    ? state.queue.find((t) => t.queueId === state.playback?.queueId)
    : null;

  const playerTrack: Track = currentQueueTrack
    ? {
        id: currentQueueTrack.queueId,
        title: currentQueueTrack.song.title,
        artist: currentQueueTrack.song.artist,
        duration: currentQueueTrack.song.duration ?? 0,
        cover: currentQueueTrack.song.artwork,
        streamUrl: currentQueueTrack.song.streamUrl,
        accent: theme.accent,
      }
    : {
        id: "idle",
        title: (state?.queue.length ?? 0) > 0 ? "Nothing playing yet" : "Queue is empty",
        artist: isHost
          ? (state?.queue.length ?? 0) > 0
            ? "Press play to start the party"
            : "Add a track to get going"
          : "Waiting for the host to start…",
        duration: 0,
        accent: theme.accent,
      };

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

  return (
    <div className="relative min-h-dvh overflow-hidden text-white font-sans antialiased select-none">
      <Background theme={theme} />
      <Header />

      <main className="relative z-10 flex min-h-dvh flex-col gap-5 px-4 pt-24 pb-52 sm:px-8 md:flex-row md:gap-6 md:pb-56">
        {/* Left column: room controls + queue */}
        <section className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Radio className="h-4 w-4 text-black" />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest text-white/40 uppercase">
                    Room code
                  </p>
                  <p className="font-mono text-xl font-semibold tracking-[0.25em] text-white">
                    {state?.roomId.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                  onClick={leaveParty}
                  className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-3.5 py-2 text-[11px] text-red-300 transition-colors hover:bg-red-400/20 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Leave
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-3.5">
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <Users className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                {state?.members.length ?? 0} in the room
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: theme.accent }}
                />
                {state?.queue.length ?? 0} in queue
              </div>
              {isHost && (
                <div className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] tracking-wider text-white/40 uppercase">
                  You&apos;re the host
                </div>
              )}
              {!isHost && member && (
                <div className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] tracking-wider text-white/40 uppercase">
                  Listening as {member.name}
                </div>
              )}
            </div>
          </div>

          <PartyQueue
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

        {/* Right column: members + vibe + reactions */}
        <aside className="flex w-full shrink-0 flex-col gap-5 md:w-72">
          <PartyMembers
            members={state?.members ?? []}
            hostId={state?.hostId ?? ""}
            meId={member?.id ?? ""}
            accent={theme.accent}
          />

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
            <p className="mb-3 text-[10px] tracking-widest text-white/40 uppercase">
              Vibe
            </p>
            {isHost ? (
              <PartyVibePicker
                current={state?.vibeId ?? "all"}
                onChange={(vibeId) => send("setVibe", { vibeId })}
              />
            ) : (
              <p className="text-sm text-white/80">
                {theme.label} — {theme.description}
              </p>
            )}
          </div>
        </aside>
      </main>

      {playerTrack && (
        <FloatingPlayer
          track={playerTrack}
          isPlaying={audio.isPlaying}
          currentTime={audio.currentTime}
          duration={audio.duration}
          progress={audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0}
          volume={audio.volume}
          isMuted={audio.isMuted}
          accent={theme.accent}
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
    </div>
  );
}

function PartyVibePicker({
  current,
  onChange,
}: {
  current: VibeId;
  onChange: (vibeId: VibeId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {VIBE_IDS.map((id) => {
        const theme = backgroundThemes[id];
        const selected = current === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-200 cursor-pointer",
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
  );
}
