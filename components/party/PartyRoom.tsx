"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { Track } from "@/data/types";
import type { PartyMember } from "@/lib/party/types";
import { partyTheme } from "@/data/backgrounds";
import { Background } from "@/components/Background";
import { usePartyAudio } from "@/hooks/usePartyAudio";
import { usePartyActivity } from "@/hooks/usePartyActivity";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { useParty } from "@/hooks/useParty";
import { useMediaSession } from "@/hooks/useMediaSession";
import { toast } from "@/lib/toast";
import { detectHostChange } from "@/lib/party/host-change";
import { PartyTopNav } from "./PartyTopNav";
import { RoomCodeCard } from "./RoomCodeCard";
import { NowPlayingCard } from "./NowPlayingCard";
import { PartyQueue } from "./PartyQueue";
import { PartyAddSong } from "./PartyAddSong";
import { PartyMembers } from "./PartyMembers";
import { ActivityFeed } from "./ActivityFeed";
import { LeaveModal } from "./LeaveModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface PartyRoomProps {
  party: ReturnType<typeof useParty>;
}

export function PartyRoom({ party }: PartyRoomProps) {
  const { state, member, isHost, send, leaveParty, status, error: partyError, removed } = party;
  const router = useRouter();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<PartyMember | null>(null);
  const { copy } = useCopyToClipboard();

  const theme = partyTheme;

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
  const handleVote = useCallback((queueId: string) => send("vote", { queueId }), [send]);
  const handleRemoveMember = useCallback(
    (targetMemberId: string) => send("removeMember", { targetMemberId }),
    [send],
  );
  const handleToggleLock = useCallback(() => send("lockRoom"), [send]);

  const handleClearQueue = useCallback(() => {
    if (!isHost) return;
    setShowClearConfirm(true);
  }, [isHost]);

  const confirmClearQueue = useCallback(() => {
    setShowClearConfirm(false);
    send("clearQueue");
  }, [send]);

  const confirmHandover = useCallback(() => {
    const target = handoverTarget;
    setHandoverTarget(null);
    if (target) {
      send("transferHost", { targetMemberId: target.id });
    }
  }, [handoverTarget, send]);

  const handleHandover = useCallback(
    (targetMemberId: string) => {
      const target = state?.members.find((m) => m.id === targetMemberId) ?? null;
      setHandoverTarget(target);
    },
    [state?.members],
  );

  const handleInvite = useCallback(() => {
    if (!state) return;
    copy(`${window.location.origin}/party/${state.roomId}`);
  }, [state?.roomId, copy]);

  const queuedTracks = useMemo(
    () => new Map((state?.queue ?? []).map((t) => [t.song.id, t])),
    [state?.queue],
  );

  // Surface command errors while connected (disconnected states use the banner)
  useEffect(() => {
    if (partyError && status === "connected") {
      toast(partyError, "error");
    }
  }, [partyError, status]);

  // Announce host handoffs to everyone in the room.
  const prevHostIdRef = useRef("");
  useEffect(() => {
    const nextHostId = state?.hostId ?? "";
    const prev = prevHostIdRef.current;
    prevHostIdRef.current = nextHostId;
    if (!state || !prev || !nextHostId || prev === nextHostId) return;
    const change = detectHostChange(prev, nextHostId, state.members);
    if (!change) return;
    if (change.hostId === member?.id) {
      toast("You're the host now", "success");
    } else {
      toast(`${change.hostName} is now the host`, "info");
    }
  }, [state, member?.id]);

  // Surfacing a kick: the host removed this member from the room.
  useEffect(() => {
    if (!removed) return;
    toast("You were removed from the room", "error");
    router.push("/party");
  }, [removed, router]);

  // Track the server clock so presence dots stay truthful between patches,
  // and re-render periodically as heartbeats age members in and out.
  const clockOffsetRef = useRef(0);
  useEffect(() => {
    if (state) clockOffsetRef.current = state.serverNow - Date.now();
  }, [state]);
  const [, setPresenceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPresenceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const serverNowEstimate = Date.now() + clockOffsetRef.current;

  // Lock-screen / hardware media controls for everyone in the room
  useMediaSession({
    enabled: playerTrack != null,
    title: playerTrack?.title ?? "VYBE Party",
    artist: playerTrack?.artist ?? "",
    artwork: playerTrack?.cover,
    isPlaying: audio.isPlaying,
    duration: playerDuration,
    currentTime: audio.currentTime,
    onPlay: handleTogglePlay,
    onPause: handleTogglePlay,
    onNext: handleNext,
    onPrev: handlePrev,
    onSeek: handleSeek,
  });

  return (
    <div className="relative flex min-h-dvh flex-col text-white font-sans antialiased lg:h-dvh lg:overflow-hidden">
      <Background theme={theme} />

      {(status === "reconnecting") && (
        <div role="alert" className="fixed inset-x-0 top-[52px] z-40 flex items-center justify-center gap-3 bg-black/80 px-4 py-3 text-sm backdrop-blur-sm">
          <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
          <span className="text-white/70">Reconnecting…</span>
        </div>
      )}

      <PartyTopNav
        roomId={state?.roomId ?? ""}
        memberCount={state?.members.length ?? 0}
        queueCount={state?.queue.length ?? 0}
        accent={theme.accent}
        onLeave={() => setShowLeaveConfirm(true)}
      />

      {/* Content area — natural flow on mobile, viewport-locked bento at lg+ */}
      <div className="relative z-10 flex flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[60px] sm:px-5 lg:min-h-0 lg:px-6 lg:pb-4">

        {/* ─── BENTO GRID — single row, three columns at lg+ ─── */}
        <div className="grid flex-1 grid-cols-1 gap-4 lg:min-h-0 lg:grid-cols-[280px_1fr_260px] lg:gap-5">

          {/* LEFT — Room + Host Controls (full height) */}
          <div className="scrollbar-hide lg:min-h-0 lg:overflow-y-auto">
            <RoomCodeCard
              roomId={state?.roomId ?? ""}
              isHost={isHost}
              locked={state?.locked ?? false}
              accent={theme.accent}
              volume={audio.volume}
              isMuted={audio.isMuted}
              onVolumeChange={audio.setVolume}
              onToggleMute={audio.toggleMute}
              onClearQueue={handleClearQueue}
              onToggleLock={handleToggleLock}
            />
          </div>

          {/* CENTER — Now Playing + Queue */}
          <div className="flex flex-col gap-3 lg:min-h-0">
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
              className="lg:min-h-0 lg:flex-1"
              state={state}
              isHost={isHost}
              accent={theme.accent}
              memberId={member?.id ?? ""}
              onRemove={handleRemove}
              onPlayTrack={handlePlayTrack}
              onVote={handleVote}
            />
          </div>

          {/* RIGHT — Members + Activity */}
          <div className="flex flex-col gap-2 lg:min-h-0 lg:overflow-hidden">
            <div className="flex-none">
              <PartyMembers
                members={state?.members ?? []}
                hostId={state?.hostId ?? ""}
                meId={member?.id ?? ""}
                serverNow={serverNowEstimate}
                accent={theme.accent}
                loading={state === null}
                onInvite={handleInvite}
                isHostView={isHost}
                onHandover={handleHandover}
                onRemoveMember={handleRemoveMember}
              />
            </div>
            <div className="scrollbar-hide lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
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
              queuedTracks={queuedTracks}
              memberId={member?.id ?? ""}
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

      {/* Host hand-over confirm modal */}
      <ConfirmDialog
        open={handoverTarget !== null}
        title="Hand over host?"
        message={`${handoverTarget?.name ?? "This member"} will control playback for everyone.`}
        confirmLabel="Make host"
        onConfirm={confirmHandover}
        onCancel={() => setHandoverTarget(null)}
      />
    </div>
  );
}
