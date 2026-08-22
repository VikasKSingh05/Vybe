"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueItem, Track, VibeId } from "@/data/types";
import { getVibeTheme } from "@/data/vibes";
import { getPlaylistForGenre, type PlaylistEntry } from "@/data/playlists";
import type { Song } from "@/types/music";
import { useAudioElement } from "./useAudioElement";
import { resolveSong as resolveSongFn } from "@/lib/music/resolve";

interface UsePlayerOptions {
  initialVibeId?: VibeId;
  autoPlay?: boolean;
}

export function usePlayer({
  initialVibeId = "bollywood",
  autoPlay = false,
}: UsePlayerOptions = {}) {
  const [vibeId, setVibeId] = useState<VibeId>(initialVibeId);
  const [playlist, setPlaylist] = useState<PlaylistEntry[]>(() =>
    getPlaylistForGenre(initialVibeId)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [userInteracted, setUserInteracted] = useState(autoPlay);

  const songCacheRef = useRef<Map<string, Song>>(new Map());
  const failCountRef = useRef(0);
  const vibeGenerationRef = useRef(0);
  const activePlaylistRef = useRef(playlist);
  activePlaylistRef.current = playlist;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const vibeIdRef = useRef(vibeId);
  vibeIdRef.current = vibeId;
  const loadSongAtIndexRef = useRef<((index: number, shouldPlay?: boolean) => Promise<void>) | null>(null);

  const theme = getVibeTheme(vibeId);

  const [volume, setVolumeState] = useState(0.75);
  const [isMuted, setIsMutedState] = useState(false);

  const resolveSong = useCallback(
    (entry: PlaylistEntry) => resolveSongFn(songCacheRef.current, entry),
    [],
  );

  const fetchRandomSongInProgressRef = useRef(false);
  const fetchRandomSongRef = useRef<(() => Promise<void>) | null>(null);

  const { audioRef, currentTime, duration, isPlaying, isLoading: audioLoading } = useAudioElement({
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
        if (audioRef.current) audioRef.current.pause();
        return;
      }
      const nextIndex = (currentIndexRef.current + 1) % currentList.length;
      loadSongAtIndexRef.current?.(nextIndex, true);
    },
    onError: () => {
      const audio = audioRef.current;
      if (!audio?.src || audio.error?.code === 1) return;
      failCountRef.current += 1;
      const currentList = activePlaylistRef.current;
      if (failCountRef.current >= currentList.length) {
        setErrorState("Unable to stream audio.");
        return;
      }
      const nextIndex = (currentIndexRef.current + 1) % currentList.length;
      setTimeout(() => loadSongAtIndexRef.current?.(nextIndex, true), 400);
    },
  });

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, audioRef]);

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
    async (index: number, shouldPlay = true) => {
      const audio = audioRef.current;
      if (!audio) return;

      const currentList = activePlaylistRef.current;
      if (currentList.length === 0) {
        setExtraLoading(false);
        return;
      }

      const safeIndex = (index + currentList.length) % currentList.length;
      const entry = currentList[safeIndex];
      setCurrentIndex(safeIndex);
      setExtraLoading(true);
      setErrorState(null);

      audio.pause();
      audio.currentTime = 0;

      const song = await resolveSong(entry);

      if (!song || !song.streamUrl) {
        failCountRef.current += 1;

        if (failCountRef.current >= currentList.length) {
          setErrorState("Unable to play tracks in this playlist.");
          setExtraLoading(false);
          return;
        }

        setTimeout(() => loadSongAtIndexRef.current?.(safeIndex + 1, shouldPlay), 300);
        return;
      }

      failCountRef.current = 0;
      setCurrentSong(song);

      audio.src = song.streamUrl;
      audio.load();
      setExtraLoading(false);

      if (shouldPlay && userInteracted) {
        audio
          .play()
          .then(() => {
            preloadNextSong(safeIndex + 1);
          })
          .catch(() => {});
      }
    },
    [resolveSong, preloadNextSong, userInteracted, audioRef],
  );

  loadSongAtIndexRef.current = loadSongAtIndex;

  useEffect(() => {
    loadSongAtIndex(0, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addToQueue = useCallback(
    (entry: PlaylistEntry, resolvedSong?: Song, forcePlay = false) => {
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
    },
    [],
  );

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
      setVibeId(newVibeId);
      const newPlaylist = getPlaylistForGenre(newVibeId);
      setPlaylist(newPlaylist);
      activePlaylistRef.current = newPlaylist;
      failCountRef.current = 0;
      setCurrentIndex(0);
      const generation = ++vibeGenerationRef.current;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
      }

      if (newVibeId === "random") {
        setCurrentSong(null);
        setExtraLoading(false);
        return;
      }

      setTimeout(() => {
        const entry = newPlaylist[0];
        if (entry && vibeGenerationRef.current === generation) {
          setExtraLoading(true);
          resolveSong(entry).then((song) => {
            if (vibeGenerationRef.current !== generation) return;
            if (song?.streamUrl && audioRef.current) {
              setCurrentSong(song);
              audioRef.current.src = song.streamUrl;
              audioRef.current.load();
              setExtraLoading(false);
              audioRef.current
                .play()
                .catch(() => {});
            } else {
              loadSongAtIndexRef.current?.(0, true);
            }
          });
        }
      }, 50);
    },
    [resolveSong, audioRef],
  );

  const togglePlay = useCallback(() => {
    setUserInteracted(true);
    const audio = audioRef.current;
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
  }, [isPlaying, currentSong, currentIndex, loadSongAtIndex, audioRef]);

  const play = useCallback(() => {
    setUserInteracted(true);
    const audio = audioRef.current;
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
  }, [currentSong, currentIndex, loadSongAtIndex, audioRef]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [audioRef]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, [audioRef]);

  const next = useCallback(() => {
    setUserInteracted(true);
    failCountRef.current = 0;
    const isRandom = vibeIdRef.current === "random";
    if (isRandom && currentIndex >= playlist.length - 1) {
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    const nextIdx = (currentIndex + 1) % playlist.length;
    loadSongAtIndex(nextIdx, true);
  }, [currentIndex, playlist.length, loadSongAtIndex, audioRef]);

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
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    loadSongAtIndex(prevIdx, true);
  }, [currentTime, seek, currentIndex, playlist.length, loadSongAtIndex]);

  const changeVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (clamped > 0) setIsMutedState(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => !prev);
  }, []);

  const removeFromQueue = useCallback(
    (index: number) => {
      const list = activePlaylistRef.current;
      const newPlaylist = list.filter((_, i) => i !== index);
      setPlaylist(newPlaylist);
      activePlaylistRef.current = newPlaylist;

      if (newPlaylist.length === 0) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
        }
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
    [audioRef],
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
    removeFromQueue,
    clearCustomQueue,
    playAtIndex,
    progress:
      currentDuration > 0
        ? Math.min(100, Math.max(0, (clampedTime / currentDuration) * 100))
        : 0,
  };
}

export type PlayerState = ReturnType<typeof usePlayer>;
