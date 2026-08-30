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
  advanceOnEnded,
  nextIndex as nextIndexHelper,
  prevIndex as prevIndexHelper,
  shuffleList,
  type RepeatMode,
} from "@/lib/player-modes";

const CROSSFADE_MS = 2000;

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
  activePlaylistRef.current = playlist;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const vibeIdRef = useRef(vibeId);
  vibeIdRef.current = vibeId;
  const loadSongAtIndexRef = useRef<
    ((
      index: number,
      shouldPlay?: boolean,
      options?: { crossfade?: boolean },
    ) => Promise<void>) | null
  >(null);

  const theme = getVibeTheme(vibeId);

  const [volume, setVolumeState] = useState(persisted?.volume ?? 0.75);
  const [isMuted, setIsMutedState] = useState(persisted?.isMuted ?? false);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(persisted?.crossfadeEnabled ?? true);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(persisted?.repeatMode ?? "all");
  const [shuffle, setShuffle] = useState(persisted?.shuffle ?? false);
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  const resolveSong = useCallback(
    (entry: PlaylistEntry) => resolveSongFn(songCacheRef.current, entry),
    [],
  );

  const fetchRandomSongInProgressRef = useRef(false);
  const fetchRandomSongRef = useRef<(() => Promise<void>) | null>(null);

  const {
    audioRef,
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
      const currentList = activePlaylistRef.current;
      if (currentList.length === 0) {
        if (vibeIdRef.current === "random") {
          fetchRandomSongRef.current?.();
        }
        return;
      }
      if (
        vibeIdRef.current === "random" &&
        currentIndexRef.current >= currentList.length - 1
      ) {
        getActiveAudio()?.pause();
        return;
      }
      const advance = advanceOnEnded(
        currentIndexRef.current,
        currentList.length,
        repeatModeRef.current,
      );
      if (advance === null) {
        getActiveAudio()?.pause();
        return;
      }
      // Automatic track transition (natural end / random auto-advance):
      // crossfade into the next track, keep the old one fading out.
      loadSongAtIndexRef.current?.(advance, true, { crossfade: true });
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

  loadSongAtIndexRef.current = loadSongAtIndex;

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

  const fetchRandomSong = useCallback(async () => {
    if (fetchRandomSongInProgressRef.current) return;
    fetchRandomSongInProgressRef.current = true;
    try {
      const exclude = activePlaylistRef.current
        .map((e) => e.jiosaavnId)
        .filter(Boolean)
        .join(",");
      const params = new URLSearchParams({ count: "1" });
      if (exclude) params.set("exclude", exclude);
      const res = await fetch(`/api/music/discover?${params}`);
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as { songs?: Song[] } | null;
      const song = data?.songs?.[0];
      if (!song) return;
      addToQueue(
        {
          jiosaavnId: song.id,
          title: song.title,
          artist: song.artist,
          artwork: song.artwork,
          duration: song.duration,
        },
        song,
        true,
      );
    } catch {
      // Silent fail — user can press play or search manually
    } finally {
      fetchRandomSongInProgressRef.current = false;
    }
  }, [addToQueue]);

  fetchRandomSongRef.current = fetchRandomSong;

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
        if (vibeIdRef.current === "random" && activePlaylistRef.current.length === 0) {
          fetchRandomSongRef.current?.();
        } else {
          loadSongAtIndex(currentIndex, true);
        }
      } else {
        audio.play().catch(() => {});
      }
    }
  }, [isPlaying, currentSong, currentIndex, loadSongAtIndex, getActiveAudio]);

  const play = useCallback(() => {
    setUserInteracted(true);
    const audio = getActiveAudio();
    if (!audio) return;
    if (!currentSong || !audio.src) {
      if (vibeIdRef.current === "random" && activePlaylistRef.current.length === 0) {
        fetchRandomSongRef.current?.();
      } else {
        loadSongAtIndex(currentIndex, true);
      }
    } else {
      audio.play().catch(() => {});
    }
  }, [currentSong, currentIndex, loadSongAtIndex, getActiveAudio]);

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
    const isRandom = vibeIdRef.current === "random";
    if (isRandom && currentIndex >= playlist.length - 1) {
      getActiveAudio()?.pause();
      return;
    }
    const nextIdx = nextIndexHelper(currentIndex, playlist.length, repeatMode);
    if (nextIdx === null) {
      getActiveAudio()?.pause();
      return;
    }
    loadSongAtIndex(nextIdx, true);
  }, [currentIndex, playlist.length, repeatMode, loadSongAtIndex, getActiveAudio]);

  const prev = useCallback(() => {
    setUserInteracted(true);
    failCountRef.current = 0;
    if (currentTime > 3) {
      seek(0);
      return;
    }
    if (vibeIdRef.current === "random" && currentIndex === 0) {
      seek(0);
      return;
    }
    const prevIdx = prevIndexHelper(currentIndex, playlist.length, repeatMode);
    if (prevIdx === null) {
      seek(0);
      return;
    }
    loadSongAtIndex(prevIdx, true);
  }, [currentTime, seek, currentIndex, playlist.length, repeatMode, loadSongAtIndex]);

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

export type PlayerState = ReturnType<typeof usePlayer>;
