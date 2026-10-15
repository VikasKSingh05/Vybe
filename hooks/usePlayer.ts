"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueItem, Track, VibeId } from "@/data/types";
import { getVibeTheme } from "@/data/vibes";
import { getPlaylistForGenre, type PlaylistEntry } from "@/data/playlists";
import type { Song } from "@/types/music";
import { useAudioElement } from "./useAudioElement";
import { resolveSong as resolveSongFn } from "@/lib/music/resolve";
import { loadPlayerState, savePlayerState } from "@/lib/player-storage";
import { applyReorder, insertAfterCurrent } from "@/lib/queue-order";
import {
  nextIndex as nextIndexHelper,
  prevIndex as prevIndexHelper,
  shuffleList,
  type RepeatMode,
} from "@/lib/player-modes";

const CROSSFADE_MS = 2000;
// Endless "live radio": keep at least this many upcoming tracks buffered, pull
// them in batches, and cap the in-memory queue to keep the UI snappy.
const RADIO_LOOKAHEAD = 4;
const RADIO_BATCH = 8;
const RADIO_MAX_QUEUE = 300;

interface UsePlayerOptions {
  initialVibeId?: VibeId;
  autoPlay?: boolean;
}

export function usePlayer({
  initialVibeId = "bollywood",
  autoPlay = false,
}: UsePlayerOptions = {}) {
  // Read persisted session (queue/vibe/volume) once per hook instance
  const [persisted] = useState(() => loadPlayerState());

  const [vibeId, setVibeId] = useState<VibeId>(persisted?.vibeId ?? initialVibeId);
  const [playlist, setPlaylist] = useState<PlaylistEntry[]>(() =>
    persisted?.playlist ?? getPlaylistForGenre(initialVibeId)
  );
  const [currentIndex, setCurrentIndex] = useState(persisted?.currentIndex ?? 0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [userInteracted, setUserInteracted] = useState(autoPlay);

  const songCacheRef = useRef<Map<string, Song>>(new Map());
  const failCountRef = useRef(0);
  const vibeGenerationRef = useRef(0);
  const playbackRequestIdRef = useRef(0);
  const activePlaylistRef = useRef(playlist);
  const currentIndexRef = useRef(currentIndex);
  const vibeIdRef = useRef(vibeId);
  const loadSongAtIndexRef = useRef<
    ((
      index: number,
      shouldPlay?: boolean,
      options?: { crossfade?: boolean },
    ) => Promise<void>) | null
  >(null);

  const radioFetchingRef = useRef(false);
  const radioNextRetryRef = useRef(0);
  const handleEndedRef = useRef<(() => Promise<void>) | null>(null);

  // Mirror render state into refs after commit so async audio callbacks and
  // timers always observe the latest values without stale closures.
  useEffect(() => {
    activePlaylistRef.current = playlist;
    currentIndexRef.current = currentIndex;
    vibeIdRef.current = vibeId;
  });

  const theme = getVibeTheme(vibeId);

  const [volume, setVolumeState] = useState(persisted?.volume ?? 0.75);
  const [isMuted, setIsMutedState] = useState(persisted?.isMuted ?? false);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(persisted?.crossfadeEnabled ?? true);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(persisted?.repeatMode ?? "all");
  const [shuffle, setShuffle] = useState(persisted?.shuffle ?? false);
  const repeatModeRef = useRef(repeatMode);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const resolveSong = useCallback(
    (entry: PlaylistEntry) => resolveSongFn(songCacheRef.current, entry),
    [],
  );

  const {
    currentTime,
    duration,
    isPlaying,
    isLoading: audioLoading,
    crossfadeTo,
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
      failCountRef.current += 1;
      const currentList = activePlaylistRef.current;
      if (failCountRef.current >= currentList.length) {
        setErrorState("Unable to stream audio.");
        return;
      }
      const nextIdx = nextIndexHelper(
        currentIndexRef.current,
        currentList.length,
        repeatModeRef.current === "one" ? "all" : repeatModeRef.current,
      ) ?? currentIndexRef.current;
      setTimeout(() => loadSongAtIndexRef.current?.(nextIdx, true), 400);
    },
  });

  useEffect(() => {
    applyVolume(isMuted ? 0 : volume);
  }, [volume, isMuted, applyVolume]);

  // Persist the session (debounced) so a refresh restores queue + vibe
  useEffect(() => {
    const timer = setTimeout(() => {
      savePlayerState({
        vibeId,
        playlist,
        currentIndex,
        volume,
        isMuted,
        crossfadeEnabled,
        repeatMode,
        shuffle,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [vibeId, playlist, currentIndex, volume, isMuted, crossfadeEnabled, repeatMode, shuffle]);

  const preloadNextSong = useCallback(
    async (nextIdx: number) => {
      const currentList = activePlaylistRef.current;
      if (currentList.length === 0) return;
      const targetEntry = currentList[nextIdx % currentList.length];
      if (targetEntry) {
        const cacheKey =
          targetEntry.jiosaavnId?.trim() ||
          `${targetEntry.title}-${targetEntry.artist}`.toLowerCase();
        if (!songCacheRef.current.has(cacheKey)) {
          await resolveSong(targetEntry);
        }
      }
    },
    [resolveSong],
  );

  const loadSongAtIndex = useCallback(
    async (
      index: number,
      shouldPlay = true,
      options?: { crossfade?: boolean },
    ) => {
      // Every playback request gets a fresh token. Any async continuation that
      // resolves after a newer request has started is stale and must not touch
      // the audio element or start playback.
      const currentList = activePlaylistRef.current;
      const requestId = ++playbackRequestIdRef.current;

      if (currentList.length === 0) {
        setExtraLoading(false);
        return;
      }

      const safeIndex = (index + currentList.length) % currentList.length;
      const entry = currentList[safeIndex];
      setCurrentIndex(safeIndex);
      setExtraLoading(true);
      setErrorState(null);

      // Crossfade ONLY on automatic transitions (natural end / random advance),
      // which pass { crossfade: true }. Every user-initiated track change omits
      // the flag and therefore hard-switches (stopping any in-flight crossfade).
      const willCrossfade =
        options?.crossfade === true && crossfadeEnabled;
      if (!willCrossfade) {
        // Stop and clear BOTH elements (aborting any pending crossfade/load/
        // play) and re-center on the primary element before the new source.
        stopPlayback();
      }

      const audio = getActiveAudio();
      if (!audio) return;

      const song = await resolveSong(entry);

      // Superseded by a newer playback request (vibe switch, next, queue,
      // search, random, etc.) — do nothing.
      if (playbackRequestIdRef.current !== requestId) return;

      if (!song || !song.streamUrl) {
        failCountRef.current += 1;

        if (failCountRef.current >= currentList.length) {
          setErrorState("Unable to play tracks in this playlist.");
          setExtraLoading(false);
          return;
        }

        setTimeout(() => {
          if (playbackRequestIdRef.current === requestId) {
            loadSongAtIndexRef.current?.(safeIndex + 1, shouldPlay);
          }
        }, 300);
        return;
      }

      failCountRef.current = 0;
      setCurrentSong(song);

      audio.setAttribute("data-volume", String(isMuted ? 0 : volume));

      if (willCrossfade && song.streamUrl) {
        setExtraLoading(false);
        crossfadeTo(song.streamUrl, CROSSFADE_MS);
        if (shouldPlay && userInteracted) {
          preloadNextSong(safeIndex + 1);
        }
        return;
      }

      audio.src = song.streamUrl ?? "";
      audio.load();
      setExtraLoading(false);

      if (shouldPlay && userInteracted) {
        audio
          .play()
          .then(() => {
            if (playbackRequestIdRef.current === requestId) {
              preloadNextSong(safeIndex + 1);
            }
          })
          .catch(() => {});
      }
    },
    [resolveSong, preloadNextSong, userInteracted, stopPlayback, getActiveAudio, crossfadeEnabled, isMuted, volume, crossfadeTo],
  );

  useEffect(() => {
    loadSongAtIndexRef.current = loadSongAtIndex;
  }, [loadSongAtIndex]);

  // Preload the active (or restored) track for display without autoplay
  useEffect(() => {
    loadSongAtIndex(currentIndex, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToQueue = useCallback(
    (entry: PlaylistEntry, resolvedSong?: Song, forcePlay = false): boolean => {
      if (entry.jiosaavnId) {
        const exists = activePlaylistRef.current.some(
          (e) => e.jiosaavnId === entry.jiosaavnId,
        );
        if (exists) return false;
      }
      if (resolvedSong) {
        const cacheKey =
          entry.jiosaavnId?.trim() ||
          `${entry.title}-${entry.artist}`.toLowerCase();
        songCacheRef.current.set(cacheKey, resolvedSong);
      }
      const wasEmpty = activePlaylistRef.current.length === 0;
      const newPlaylist = [...activePlaylistRef.current, entry];
      const newIndex = newPlaylist.length - 1;
      setPlaylist(newPlaylist);
      activePlaylistRef.current = newPlaylist;
      if (wasEmpty || forcePlay) {
        setUserInteracted(true);
        const targetIndex = wasEmpty ? 0 : newIndex;
        setTimeout(() => loadSongAtIndexRef.current?.(targetIndex, true), 50);
      }
      return true;
    },
    [],
  );

  // Insert a song to play right after the current one
  const playNextInQueue = useCallback(
    (entry: PlaylistEntry, resolvedSong?: Song): boolean => {
      if (entry.jiosaavnId) {
        const exists = activePlaylistRef.current.some(
          (e) => e.jiosaavnId === entry.jiosaavnId,
        );
        if (exists) return false;
      }
      if (resolvedSong) {
        const cacheKey =
          entry.jiosaavnId?.trim() ||
          `${entry.title}-${entry.artist}`.toLowerCase();
        songCacheRef.current.set(cacheKey, resolvedSong);
      }
      const wasEmpty = activePlaylistRef.current.length === 0;
      const newList = insertAfterCurrent(
        activePlaylistRef.current,
        currentIndexRef.current,
        entry,
      );
      setPlaylist(newList);
      activePlaylistRef.current = newList;
      if (wasEmpty) {
        setUserInteracted(true);
        setTimeout(() => loadSongAtIndexRef.current?.(0, true), 50);
      }
      return true;
    },
    [],
  );

  // Reorder via drag — playback stays anchored to the same song
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

  // Endless "live radio" refill: fetch more songs for the current vibe and
  // append them to the queue. Curated playlists act as seeds; once their tail
  // is reached the station keeps discovering new tracks instead of looping.
  const refillRadio = useCallback(async (count = RADIO_BATCH): Promise<number> => {
    const currentLength = activePlaylistRef.current.length;
    if (radioFetchingRef.current) return currentLength;
    if (currentLength >= RADIO_MAX_QUEUE) return currentLength;
    if (Date.now() < radioNextRetryRef.current) return currentLength;

    radioFetchingRef.current = true;
    const requestedVibe = vibeIdRef.current;
    try {
      const exclude = activePlaylistRef.current
        .map((e) => e.jiosaavnId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .join(",");
      const params = new URLSearchParams({ count: String(count), vibe: requestedVibe });
      if (exclude) params.set("exclude", exclude);

      const res = await fetch(`/api/music/discover?${params}`);
      if (!res.ok) return activePlaylistRef.current.length;

      const data = (await res.json().catch(() => null)) as { songs?: Song[] } | null;
      const songs = data?.songs ?? [];
      if (songs.length === 0) {
        // Back off before trying again so a quiet upstream cannot spin us.
        radioNextRetryRef.current = Date.now() + 15_000;
        return activePlaylistRef.current.length;
      }

      // The user switched vibes while we were fetching — drop the stale batch.
      if (vibeIdRef.current !== requestedVibe) return activePlaylistRef.current.length;

      const seenIds = new Set(
        activePlaylistRef.current.map((e) => e.jiosaavnId).filter(Boolean),
      );
      const seenTitles = new Set(
        activePlaylistRef.current.map((e) => `${e.title}-${e.artist}`.toLowerCase()),
      );

      const additions: PlaylistEntry[] = [];
      for (const song of songs) {
        if (!song.streamUrl || seenIds.has(song.id)) continue;
        const key = `${song.title}-${song.artist}`.toLowerCase();
        if (seenTitles.has(key)) continue;
        seenIds.add(song.id);
        seenTitles.add(key);
        songCacheRef.current.set(song.id, song);
        additions.push({
          jiosaavnId: song.id,
          title: song.title,
          artist: song.artist,
          artwork: song.artwork,
          duration: song.duration,
        });
      }

      if (additions.length === 0) return activePlaylistRef.current.length;

      const nextList = [...activePlaylistRef.current, ...additions];
      setPlaylist(nextList);
      activePlaylistRef.current = nextList;
      return nextList.length;
    } catch {
      // Silent fail — the user can still play the songs already queued.
      return activePlaylistRef.current.length;
    } finally {
      radioFetchingRef.current = false;
    }
  }, []);

  // Keep the queue topped up: whenever the upcoming buffer runs low, append a
  // fresh batch for the active vibe. Empty lists are left alone so the radio
  // starts on an explicit user gesture (play / next).
  useEffect(() => {
    if (playlist.length === 0) return;
    const upcoming = playlist.length - currentIndex - 1;
    if (upcoming >= RADIO_LOOKAHEAD) return;
    void refillRadio(RADIO_BATCH);
  }, [playlist, currentIndex, refillRadio]);

  const startRadioPlayback = useCallback(async () => {
    if (activePlaylistRef.current.length === 0) {
      await refillRadio(RADIO_BATCH);
    }
    if (activePlaylistRef.current.length > 0) {
      loadSongAtIndexRef.current?.(0, true);
    }
  }, [refillRadio]);

  // Natural end of a track. Advance within the list; at the tail, extend the
  // radio with newly discovered songs before wrapping (or stopping).
  const handleEnded = useCallback(async () => {
    const list = activePlaylistRef.current;
    const mode = repeatModeRef.current;
    const idx = currentIndexRef.current;

    if (list.length === 0) {
      const length = await refillRadio(RADIO_BATCH);
      if (length > 0) loadSongAtIndexRef.current?.(0, true);
      return;
    }

    if (mode === "one") {
      loadSongAtIndexRef.current?.(idx, true, { crossfade: true });
      return;
    }

    if (idx < list.length - 1) {
      loadSongAtIndexRef.current?.(idx + 1, true, { crossfade: true });
      return;
    }

    const length = await refillRadio(RADIO_BATCH);
    if (length > idx + 1) {
      loadSongAtIndexRef.current?.(idx + 1, true, { crossfade: true });
      return;
    }
    if (mode === "all") {
      loadSongAtIndexRef.current?.(0, true, { crossfade: true });
      return;
    }
    getActiveAudio()?.pause();
  }, [refillRadio, getActiveAudio]);

  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

  // Manual "next" at the tail behaves like a natural end: extend then advance,
  // falling back to wrapping under repeat-all (or stopping).
  const extendAndPlayNext = useCallback(async () => {
    const idx = currentIndexRef.current;
    const length = await refillRadio(RADIO_BATCH);
    if (length > idx + 1) {
      loadSongAtIndexRef.current?.(idx + 1, true);
    } else if (repeatModeRef.current === "all" && length > 0) {
      loadSongAtIndexRef.current?.(0, true);
    } else {
      getActiveAudio()?.pause();
    }
  }, [refillRadio, getActiveAudio]);

  const changeVibe = useCallback(
    (newVibeId: VibeId) => {
      setUserInteracted(true);

      // Invalidate every outstanding playback operation from the previous vibe
      // and hard-stop ALL audio surfaces so the old source cannot continue or
      // resume. This is the same "stop before you switch" the player uses for
      // any track change.
      const generation = ++vibeGenerationRef.current;
      const requestId = ++playbackRequestIdRef.current;
      stopPlayback();

      setVibeId(newVibeId);
      const newPlaylist = getPlaylistForGenre(newVibeId);
      setPlaylist(newPlaylist);
      activePlaylistRef.current = newPlaylist;
      radioNextRetryRef.current = 0;
      failCountRef.current = 0;
      setCurrentIndex(0);
      setCurrentSong(null);
      setExtraLoading(false);

      if (newVibeId === "random") {
        return;
      }

      // Let the new vibe settle in the UI, then start its first song through
      // the canonical pipeline. Only start if nothing newer superseded it.
      setTimeout(() => {
        if (
          vibeGenerationRef.current === generation &&
          playbackRequestIdRef.current === requestId
        ) {
          loadSongAtIndexRef.current?.(0, true);
        }
      }, 50);
    },
    [stopPlayback],
  );

  const togglePlay = useCallback(() => {
    setUserInteracted(true);
    const audio = getActiveAudio();
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (!currentSong || !audio.src) {
        if (activePlaylistRef.current.length === 0) {
          void startRadioPlayback();
        } else {
          loadSongAtIndex(currentIndex, true);
        }
      } else {
        audio.play().catch(() => {});
      }
    }
  }, [isPlaying, currentSong, currentIndex, loadSongAtIndex, getActiveAudio, startRadioPlayback]);

  const play = useCallback(() => {
    setUserInteracted(true);
    const audio = getActiveAudio();
    if (!audio) return;
    if (!currentSong || !audio.src) {
      if (activePlaylistRef.current.length === 0) {
        void startRadioPlayback();
      } else {
        loadSongAtIndex(currentIndex, true);
      }
    } else {
      audio.play().catch(() => {});
    }
  }, [currentSong, currentIndex, loadSongAtIndex, getActiveAudio, startRadioPlayback]);

  const pause = useCallback(() => {
    getActiveAudio()?.pause();
  }, [getActiveAudio]);

  const seek = useCallback((time: number) => {
    const audio = getActiveAudio();
    if (audio) audio.currentTime = time;
  }, [getActiveAudio]);

  const next = useCallback(() => {
    setUserInteracted(true);
    failCountRef.current = 0;
    const list = activePlaylistRef.current;
    if (list.length === 0) {
      void startRadioPlayback();
      return;
    }
    const nextIdx = nextIndexHelper(
      currentIndexRef.current,
      list.length,
      repeatModeRef.current,
    );
    if (nextIdx === null) {
      // At the tail with repeat off: extend the radio before giving up.
      void extendAndPlayNext();
      return;
    }
    loadSongAtIndexRef.current?.(nextIdx, true);
  }, [startRadioPlayback, extendAndPlayNext]);

  const prev = useCallback(() => {
    setUserInteracted(true);
    failCountRef.current = 0;
    if (currentTime > 3) {
      seek(0);
      return;
    }
    const list = activePlaylistRef.current;
    const prevIdx = prevIndexHelper(
      currentIndexRef.current,
      list.length,
      repeatModeRef.current,
    );
    if (prevIdx === null) {
      seek(0);
      return;
    }
    loadSongAtIndexRef.current?.(prevIdx, true);
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
    // Enabling shuffle reorders the playlist once, keeping the current song
    // anchored at its index. Disabling just flips the flag.
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
      const list = activePlaylistRef.current;
      const newPlaylist = list.filter((_, i) => i !== index);
      setPlaylist(newPlaylist);
      activePlaylistRef.current = newPlaylist;

      if (newPlaylist.length === 0) {
        stopPlayback();
        setCurrentSong(null);
        setCurrentIndex(0);
        return;
      }

      if (index < currentIndexRef.current) {
        setCurrentIndex((prev) => prev - 1);
      } else if (index === currentIndexRef.current) {
        const nextIdx = currentIndexRef.current % newPlaylist.length;
        loadSongAtIndexRef.current?.(nextIdx, true);
      }
    },
    [stopPlayback],
  );

  const clearCustomQueue = useCallback(() => {
    setPlaylist([]);
    activePlaylistRef.current = [];
    setCurrentIndex(0);
    setExtraLoading(false);
    setErrorState(null);
  }, []);

  const playAtIndex = useCallback(
    (index: number) => {
      setUserInteracted(true);
      failCountRef.current = 0;
      const list = activePlaylistRef.current;
      if (index < 0 || index >= list.length) return;
      loadSongAtIndexRef.current?.(index, true);
    },
    [],
  );

  const activeEntry = playlist[currentIndex] || {
    title: "VYBE Radio",
    artist: "Selecting vibe...",
  };

  const track: Track = {
    id: currentSong?.id || activeEntry.jiosaavnId || `${activeEntry.title}-${activeEntry.artist}`,
    title: currentSong?.title || activeEntry.title,
    artist: currentSong?.artist || activeEntry.artist,
    duration: duration || currentSong?.duration || 180,
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
    isRandomMode: vibeId === "random",
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
  };
}
