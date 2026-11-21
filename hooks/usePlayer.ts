"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueItem, Track, VibeId } from "@/data/types";
import { getVibeTheme } from "@/data/vibes";
import type { PlaylistEntry } from "@/data/playlists";
import type { Song } from "@/types/music";
import { useAudioElement } from "./useAudioElement";
import { resolveSong as resolveSongFn } from "@/lib/music/resolve";
import { loadPlayerState, savePlayerState } from "@/lib/player-storage";
import { applyReorder, insertAfterCurrent } from "@/lib/queue-order";
import { shuffleList, type RepeatMode } from "@/lib/player-modes";
import { wireToPlaylist } from "@/lib/radio/wire-playlist";
import type { StationWire } from "@/lib/radio/types";
import { useSharedRadioSync } from "./useSharedRadioSync";

interface UsePlayerOptions {
  /** Initial visual theme. Vibes no longer select independent stations. */
  initialVibeId?: VibeId;
  autoPlay?: boolean;
}

export function usePlayer({
  initialVibeId = "bollywood",
  autoPlay = false,
}: UsePlayerOptions = {}) {
  const [persisted] = useState(() => loadPlayerState());

  const initialVibe = persisted?.vibeId ?? initialVibeId;
  const [vibeId, setVibeId] = useState<VibeId>(initialVibe);
  const [playlist, setPlaylist] = useState<PlaylistEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [userInteracted, setUserInteracted] = useState(autoPlay);

  const songCacheRef = useRef<Map<string, Song>>(new Map());
  const playbackRequestIdRef = useRef(0);
  const activePlaylistRef = useRef(playlist);
  const currentIndexRef = useRef(currentIndex);
  const handleEndedRef = useRef<(() => Promise<void>) | null>(null);
  const stationBroadcastSigRef = useRef("");
  const stationSyncingRef = useRef(false);
  const userPausedRef = useRef(false);

  const sharedRadio = useSharedRadioSync();
  const sharedRadioRef = useRef(sharedRadio);
  const userInteractedRef = useRef(userInteracted);
  const syncFromSharedWireRef =
    useRef<((wire: StationWire, shouldPlay: boolean) => Promise<void>) | null>(null);
  const loadSongAtIndexRef = useRef<
    ((index: number, shouldPlay?: boolean) => Promise<void>) | null
  >(null);

  useEffect(() => {
    sharedRadioRef.current = sharedRadio;
  }, [sharedRadio]);

  useEffect(() => {
    userInteractedRef.current = userInteracted;
  }, [userInteracted]);

  useEffect(() => {
    activePlaylistRef.current = playlist;
    currentIndexRef.current = currentIndex;
  });

  const theme = getVibeTheme(vibeId);

  const [volume, setVolumeState] = useState(persisted?.volume ?? 0.75);
  const [isMuted, setIsMutedState] = useState(persisted?.isMuted ?? false);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(persisted?.crossfadeEnabled ?? true);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(persisted?.repeatMode ?? "all");
  const [shuffle, setShuffle] = useState(persisted?.shuffle ?? false);

  const resolveSong = useCallback(
    (entry: PlaylistEntry) => resolveSongFn(songCacheRef.current, entry),
    [],
  );

  const {
    currentTime,
    duration,
    isPlaying,
    isLoading: audioLoading,
    getActiveAudio,
    stopPlayback,
    applyVolume,
  } = useAudioElement({
    onEnded: () => {
      void handleEndedRef.current?.();
    },
    onError: () => {
      const audio = getActiveAudio();
      if (!audio?.src || audio.error?.code === 1) return;
      const refId = sharedRadioRef.current.wire?.current?.refId;
      if (!refId) {
        setErrorState("Unable to stream audio.");
        return;
      }
      void sharedRadioRef.current.reportFailure(refId).then((wire) => {
        if (wire) {
          void syncFromSharedWireRef.current?.(
            wire,
            userInteractedRef.current && !userPausedRef.current,
          );
        }
      });
    },
  });

  useEffect(() => {
    applyVolume(isMuted ? 0 : volume);
  }, [volume, isMuted, applyVolume]);

  // Only the visual theme and mixer settings are persisted. The queue itself
  // always comes from the shared station on load.
  useEffect(() => {
    const timer = setTimeout(() => {
      savePlayerState({
        vibeId,
        playlist: [],
        currentIndex: 0,
        volume,
        isMuted,
        crossfadeEnabled,
        repeatMode,
        shuffle,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [vibeId, volume, isMuted, crossfadeEnabled, repeatMode, shuffle]);

  /** Play a local queue entry (used for listener-added songs only). */
  const loadSongAtIndex = useCallback(
    async (index: number, shouldPlay = true) => {
      const currentList = activePlaylistRef.current;
      if (currentList.length === 0) {
        setExtraLoading(false);
        return;
      }

      const requestId = ++playbackRequestIdRef.current;
      const safeIndex = (index + currentList.length) % currentList.length;
      const entry = currentList[safeIndex];
      setCurrentIndex(safeIndex);
      setExtraLoading(true);
      setErrorState(null);
      stopPlayback();

      const audio = getActiveAudio();
      if (!audio) return;

      const song = await resolveSong(entry);
      if (playbackRequestIdRef.current !== requestId) return;

      if (!song?.streamUrl) {
        setErrorState("Unable to play this track.");
        setExtraLoading(false);
        return;
      }

      setCurrentSong(song);
      audio.src = song.streamUrl;
      audio.load();
      setExtraLoading(false);

      if (shouldPlay && userInteracted) {
        audio.play().catch(() => {});
      }
    },
    [resolveSong, userInteracted, stopPlayback, getActiveAudio],
  );

  useEffect(() => {
    loadSongAtIndexRef.current = loadSongAtIndex;
  }, [loadSongAtIndex]);

  /** Replace local playback with the server-authoritative broadcast. */
  const syncFromSharedWire = useCallback(
    async (wire: StationWire, shouldPlay: boolean) => {
      if (stationSyncingRef.current || !wire.current) return;

      const sig = `${wire.version}|${wire.current.refId}|${wire.startedAtMs}`;
      if (sig === stationBroadcastSigRef.current && activePlaylistRef.current.length > 0) {
        return;
      }

      stationSyncingRef.current = true;
      try {
        stationBroadcastSigRef.current = sig;
        const entries = wireToPlaylist(wire);
        setPlaylist(entries);
        activePlaylistRef.current = entries;
        setCurrentIndex(0);

        const requestId = ++playbackRequestIdRef.current;
        setExtraLoading(true);
        setErrorState(null);
        stopPlayback();

        const audio = getActiveAudio();
        if (!audio || entries.length === 0) {
          setExtraLoading(false);
          return;
        }

        const song = await resolveSong(entries[0]);
        if (playbackRequestIdRef.current !== requestId) return;

        if (!song?.streamUrl) {
          setExtraLoading(false);
          setErrorState("This station track is unavailable.");
          void sharedRadioRef.current.reportFailure(wire.current.refId);
          return;
        }

        setCurrentSong(song);
        audio.src = song.streamUrl;
        audio.load();

        const seekSec = Math.max(0, wire.expectedPositionMs / 1000);
        const applySeek = () => {
          if (seekSec <= 0) return;
          try {
            const cap =
              audio.duration && Number.isFinite(audio.duration)
                ? Math.max(0, audio.duration - 0.5)
                : seekSec;
            audio.currentTime = Math.min(seekSec, cap);
          } catch {
            // Stream may not support seeking — local playback starts at 0.
          }
        };
        audio.addEventListener("loadedmetadata", applySeek, { once: true });

        setExtraLoading(false);
        const playNow = shouldPlay && userInteractedRef.current && !userPausedRef.current;
        if (playNow) {
          audio.play().catch(() => {});
        }

        // Discovery results often lack a duration and the station falls back
        // to a default. Correct it with the real value from the stream.
        if (song.duration && Number.isFinite(song.duration) && song.duration > 0) {
          const reportedMs = Math.round(song.duration * 1000);
          if (Math.abs(wire.current.durationMs - reportedMs) > 1000) {
            void sharedRadioRef.current.reportDuration(wire.current.refId, reportedMs);
          }
        }
      } finally {
        stationSyncingRef.current = false;
      }
    },
    [resolveSong, stopPlayback, getActiveAudio],
  );

  useEffect(() => {
    syncFromSharedWireRef.current = syncFromSharedWire;
  }, [syncFromSharedWire]);

  useEffect(() => {
    if (!sharedRadio.wire?.current) return;
    void syncFromSharedWire(sharedRadio.wire, userInteracted && !userPausedRef.current);
  }, [sharedRadio.wire, syncFromSharedWire, userInteracted]);

  const addToQueue = useCallback(
    (entry: PlaylistEntry, resolvedSong?: Song, forcePlay = false): boolean => {
      if (entry.jiosaavnId) {
        const exists = activePlaylistRef.current.some(
          (e) => e.jiosaavnId === entry.jiosaavnId,
        );
        if (exists) return false;
      }
      if (resolvedSong) {
        songCacheRef.current.set(
          resolvedSong.id || entry.jiosaavnId || `${entry.title}-${entry.artist}`,
          resolvedSong,
        );
      }
      const newList = insertAfterCurrent(
        activePlaylistRef.current,
        currentIndexRef.current,
        entry,
      );
      setPlaylist(newList);
      activePlaylistRef.current = newList;
      if (forcePlay) {
        setUserInteracted(true);
        userPausedRef.current = false;
        const target = Math.min(currentIndexRef.current + 1, newList.length - 1);
        setTimeout(() => loadSongAtIndexRef.current?.(target, true), 50);
      }
      return true;
    },
    [],
  );

  const playNextInQueue = useCallback(
    (entry: PlaylistEntry, resolvedSong?: Song): boolean =>
      addToQueue(entry, resolvedSong, false),
    [addToQueue],
  );

  const reorderQueue = useCallback((from: number, to: number) => {
    const result = applyReorder(
      activePlaylistRef.current,
      from,
      to,
      currentIndexRef.current,
    );
    if (!result) return;
    setPlaylist(result.list);
    activePlaylistRef.current = result.list;
    setCurrentIndex(result.currentIndex);
  }, []);

  const handleEnded = useCallback(async () => {
    const refId = sharedRadioRef.current.wire?.current?.refId;
    if (!refId) return;
    const wire = await sharedRadioRef.current.reportComplete(refId);
    if (wire) {
      await syncFromSharedWireRef.current?.(
        wire,
        userInteractedRef.current && !userPausedRef.current,
      );
    }
  }, []);

  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

  /** Theme changes only — the single broadcast keeps playing uninterrupted. */
  const changeVibe = useCallback((newVibeId: VibeId) => {
    setUserInteracted(true);
    setVibeId(newVibeId);
  }, []);

  const togglePlay = useCallback(() => {
    setUserInteracted(true);
    const audio = getActiveAudio();
    if (!audio) return;

    if (isPlaying) {
      userPausedRef.current = true;
      audio.pause();
      return;
    }

    userPausedRef.current = false;
    if (!currentSong || !audio.src) {
      const wire = sharedRadioRef.current.wire;
      if (wire) void syncFromSharedWireRef.current?.(wire, true);
      return;
    }
    audio.play().catch(() => {});
  }, [isPlaying, currentSong, getActiveAudio]);

  const play = useCallback(() => {
    setUserInteracted(true);
    userPausedRef.current = false;
    const audio = getActiveAudio();
    if (!audio) return;

    if (!currentSong || !audio.src) {
      const wire = sharedRadioRef.current.wire;
      if (wire) void syncFromSharedWireRef.current?.(wire, true);
      return;
    }
    audio.play().catch(() => {});
  }, [currentSong, getActiveAudio]);

  const pause = useCallback(() => {
    userPausedRef.current = true;
    getActiveAudio()?.pause();
  }, [getActiveAudio]);

  const seek = useCallback((time: number) => {
    const audio = getActiveAudio();
    if (audio) audio.currentTime = time;
  }, [getActiveAudio]);

  const next = useCallback(() => {
    setUserInteracted(true);
    userPausedRef.current = false;
    void sharedRadioRef.current.skipStation().then((wire) => {
      if (wire) void syncFromSharedWireRef.current?.(wire, true);
    });
  }, []);

  const prev = useCallback(() => {
    setUserInteracted(true);
    if (currentTime > 3) {
      seek(0);
      return;
    }
    void loadSongAtIndexRef.current?.(currentIndexRef.current, true);
  }, [currentTime, seek]);

  const changeVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (clamped > 0) setIsMutedState(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    const wasOn = shuffle;
    setShuffle(!wasOn);
    if (!wasOn) {
      const reordered = shuffleList(activePlaylistRef.current, currentIndexRef.current);
      if (reordered) {
        setPlaylist(reordered);
        activePlaylistRef.current = reordered;
      }
    }
  }, [shuffle]);

  const removeFromQueue = useCallback(
    (index: number) => {
      const newPlaylist = activePlaylistRef.current.filter((_, i) => i !== index);
      setPlaylist(newPlaylist);
      activePlaylistRef.current = newPlaylist;

      if (newPlaylist.length === 0) {
        stopPlayback();
        setCurrentSong(null);
        setCurrentIndex(0);
        stationBroadcastSigRef.current = "";
        const wire = sharedRadioRef.current.wire;
        if (wire) void syncFromSharedWireRef.current?.(wire, false);
        return;
      }

      if (index < currentIndexRef.current) {
        setCurrentIndex((prev) => prev - 1);
      } else if (index === currentIndexRef.current) {
        const nextIdx = currentIndexRef.current % newPlaylist.length;
        void loadSongAtIndexRef.current?.(nextIdx, true);
      }
    },
    [stopPlayback],
  );

  const clearCustomQueue = useCallback(() => {
    stationBroadcastSigRef.current = "";
    const wire = sharedRadioRef.current.wire;
    if (!wire) {
      setPlaylist([]);
      activePlaylistRef.current = [];
      setCurrentIndex(0);
      setExtraLoading(false);
      setErrorState(null);
      return;
    }
    void syncFromSharedWireRef.current?.(wire, false);
  }, []);

  const playAtIndex = useCallback((index: number) => {
    setUserInteracted(true);
    userPausedRef.current = false;
    const list = activePlaylistRef.current;
    if (index < 0 || index >= list.length) return;
    void loadSongAtIndexRef.current?.(index, true);
  }, []);

  const activeEntry = playlist[currentIndex] || {
    title: "VYBE LIVE",
    artist: "Tuning in...",
  };
  const fallbackDuration = sharedRadio.wire?.current?.durationMs
    ? sharedRadio.wire.current.durationMs / 1000
    : 180;

  const track: Track = {
    id: currentSong?.id || activeEntry.jiosaavnId || `${activeEntry.title}-${activeEntry.artist}`,
    title: currentSong?.title || activeEntry.title,
    artist: currentSong?.artist || activeEntry.artist,
    duration: duration || currentSong?.duration || fallbackDuration,
    cover: currentSong?.artwork || "/covers/default.jpg",
    streamUrl: currentSong?.streamUrl,
    accent: theme.accent,
  };

  const currentDuration = duration > 0 ? duration : track.duration;
  const clampedTime = Math.min(currentDuration, Math.max(0, currentTime));

  const queueItems: QueueItem[] = playlist.map((entry, i) => ({
    queueItemId: `${entry.title}-${entry.artist}-${i}`,
    title: entry.title,
    artist: entry.artist,
    jiosaavnId: entry.jiosaavnId,
    artwork: entry.artwork,
    duration: entry.duration,
    mood: entry.mood,
    energy: entry.energy,
  }));

  return {
    vibeId,
    theme,
    track,
    isPlaying,
    isLoading: extraLoading || audioLoading,
    error: errorState,
    currentTime: clampedTime,
    duration: currentDuration,
    volume,
    isMuted,
    queueItems,
    queueLength: playlist.length,
    currentIndex,
    togglePlay,
    play,
    pause,
    seek,
    next,
    prev,
    changeVibe,
    changeVolume,
    toggleMute,
    addToQueue,
    playNextInQueue,
    reorderQueue,
    removeFromQueue,
    clearCustomQueue,
    playAtIndex,
    crossfadeEnabled,
    setCrossfadeEnabled,
    repeatMode,
    setRepeatMode,
    shuffle,
    toggleShuffle,
    progress:
      currentDuration > 0
        ? Math.min(100, Math.max(0, (clampedTime / currentDuration) * 100))
        : 0,
    isStationSyncing: sharedRadio.isSyncing,
    isLiveStation: true,
    stationStatus: sharedRadio.wire?.status ?? null,
    refreshWire: sharedRadio.refreshWire,
  };
}
