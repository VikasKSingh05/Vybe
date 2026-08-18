"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Track, VibeId } from "@/data/types";
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
  initialVibeId = "all",
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
  const activePlaylistRef = useRef(playlist);
  activePlaylistRef.current = playlist;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const loadSongAtIndexRef = useRef<((index: number, shouldPlay?: boolean) => Promise<void>) | null>(null);

  const theme = getVibeTheme(vibeId);

  const [volume, setVolumeState] = useState(0.75);
  const [isMuted, setIsMutedState] = useState(false);

  const { audioRef, currentTime, duration, isPlaying, isLoading: audioLoading } = useAudioElement({
    onEnded: () => {
      const currentList = activePlaylistRef.current;
      if (currentList.length === 0) return;
      const nextIndex = (currentIndexRef.current + 1) % currentList.length;
      loadSongAtIndexRef.current?.(nextIndex, true);
    },
    onError: () => {
      const audio = audioRef.current;
      if (!audio?.src || audio.error?.code === 1) return;
      console.warn("[VYBE Audio] Real playback error for audio source:", audio.error);
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

  const resolveSong = useCallback(
    (entry: PlaylistEntry) => resolveSongFn(songCacheRef.current, entry),
    [],
  );

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
        setErrorState("Playlist is empty");
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
        console.warn(`[VYBE] Track "${entry.title}" failed to resolve stream.`);
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
          .catch((err) => {
            console.warn("[VYBE] Autoplay error:", err);
          });
      }
    },
    [resolveSong, preloadNextSong, userInteracted, audioRef],
  );

  loadSongAtIndexRef.current = loadSongAtIndex;

  useEffect(() => {
    loadSongAtIndex(0, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeVibe = useCallback(
    (newVibeId: VibeId) => {
      setUserInteracted(true);
      setVibeId(newVibeId);
      const newPlaylist = getPlaylistForGenre(newVibeId);
      setPlaylist(newPlaylist);
      failCountRef.current = 0;
      setCurrentIndex(0);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
      }

      setTimeout(() => {
        const entry = newPlaylist[0];
        if (entry) {
          setExtraLoading(true);
          resolveSong(entry).then((song) => {
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
        loadSongAtIndex(currentIndex, true);
      } else {
        audio
          .play()
          .catch((err) => console.warn("[VYBE] Play failed:", err));
      }
    }
  }, [isPlaying, currentSong, currentIndex, loadSongAtIndex, audioRef]);

  const play = useCallback(() => {
    setUserInteracted(true);
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentSong || !audio.src) {
      loadSongAtIndex(currentIndex, true);
    } else {
      audio
        .play()
        .catch((err) => console.warn("[VYBE] Play failed:", err));
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
    const nextIdx = (currentIndex + 1) % playlist.length;
    loadSongAtIndex(nextIdx, true);
  }, [currentIndex, playlist.length, loadSongAtIndex]);

  const prev = useCallback(() => {
    setUserInteracted(true);
    failCountRef.current = 0;
    if (currentTime > 3) {
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
    togglePlay,
    play,
    pause,
    seek,
    next,
    prev,
    changeVibe,
    changeVolume,
    toggleMute,
    progress:
      currentDuration > 0
        ? Math.min(100, Math.max(0, (clampedTime / currentDuration) * 100))
        : 0,
  };
}

export type PlayerState = ReturnType<typeof usePlayer>;
