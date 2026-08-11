"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Track, VibeId } from "@/data/types";
import { getVibeTheme } from "@/data/vibes";
import { getPlaylistForGenre, type PlaylistEntry } from "@/data/playlists";
import type { Song } from "@/types/music";

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [isMuted, setIsMutedState] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [userInteracted, setUserInteracted] = useState(autoPlay);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const songCacheRef = useRef<Map<string, Song>>(new Map());
  const failCountRef = useRef(0);
  const activePlaylistRef = useRef(playlist);
  activePlaylistRef.current = playlist;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const theme = getVibeTheme(vibeId);

  // Initialize HTML5 Audio instance once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setErrorState(null);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      audio.removeAttribute("src");
    };
  }, []);

  // Sync volume and mute settings to Audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Helper to resolve song from cache or API
  const resolveSong = useCallback(
    async (entry: PlaylistEntry): Promise<Song | null> => {
      const cached = songCacheRef.current.get(entry.jiosaavnId);
      if (cached && cached.streamUrl) {
        return cached;
      }

      try {
        const queryParam = encodeURIComponent(`${entry.title} ${entry.artist}`);
        const res = await fetch(`/api/music/song/${entry.jiosaavnId}?query=${queryParam}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: Song = await res.json();
        if (data && data.streamUrl) {
          songCacheRef.current.set(entry.jiosaavnId, data);
          return data;
        }
      } catch (err) {
        console.warn(`[VYBE] Failed to resolve song ${entry.title}:`, err);
      }

      return null;
    },
    []
  );

  // Preload next track metadata
  const preloadNextSong = useCallback(
    async (nextIdx: number) => {
      const currentList = activePlaylistRef.current;
      if (currentList.length === 0) return;
      const targetEntry = currentList[nextIdx % currentList.length];
      if (targetEntry && !songCacheRef.current.has(targetEntry.jiosaavnId)) {
        await resolveSong(targetEntry);
      }
    },
    [resolveSong]
  );

  // Core function to load and play a song index
  const loadSongAtIndex = useCallback(
    async (index: number, shouldPlay = true) => {
      const audio = audioRef.current;
      if (!audio) return;

      const currentList = activePlaylistRef.current;
      if (currentList.length === 0) {
        setErrorState("Playlist is empty");
        setIsLoading(false);
        return;
      }

      const safeIndex = (index + currentList.length) % currentList.length;
      const entry = currentList[safeIndex];
      setCurrentIndex(safeIndex);
      setIsLoading(true);
      setErrorState(null);

      // Stop current playback cleanly without firing artificial error
      audio.pause();
      setCurrentTime(0);

      const song = await resolveSong(entry);

      if (!song || !song.streamUrl) {
        console.warn(`[VYBE] Track "${entry.title}" failed to resolve stream.`);
        failCountRef.current += 1;

        if (failCountRef.current >= currentList.length) {
          setErrorState("Unable to play tracks in this playlist.");
          setIsLoading(false);
          setIsPlaying(false);
          return;
        }

        // Auto skip to next song if this one failed
        setTimeout(() => {
          loadSongAtIndex(safeIndex + 1, shouldPlay);
        }, 300);
        return;
      }

      // Reset fail counter on success
      failCountRef.current = 0;
      setCurrentSong(song);
      setDuration(song.duration || 0);

      audio.src = song.streamUrl;
      audio.load();
      setIsLoading(false);

      if (shouldPlay && userInteracted) {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            preloadNextSong(safeIndex + 1);
          })
          .catch((err) => {
            console.warn("[VYBE] Autoplay error:", err);
            setIsPlaying(false);
          });
      }
    },
    [resolveSong, preloadNextSong, userInteracted]
  );

  // Attach ended and error listeners with latest refs
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      const currentList = activePlaylistRef.current;
      if (currentList.length === 0) return;
      const nextIndex = (currentIndexRef.current + 1) % currentList.length;
      loadSongAtIndex(nextIndex, true);
    };

    const handleError = () => {
      // Ignore false error events caused by empty src or aborted requests
      if (!audio.src || audio.error?.code === 1) {
        return;
      }

      console.warn("[VYBE Audio] Real playback error for audio source:", audio.error);
      failCountRef.current += 1;
      const currentList = activePlaylistRef.current;
      if (failCountRef.current >= currentList.length) {
        setErrorState("Unable to stream audio.");
        setIsPlaying(false);
        setIsLoading(false);
        return;
      }
      const nextIndex = (currentIndexRef.current + 1) % currentList.length;
      setTimeout(() => {
        loadSongAtIndex(nextIndex, true);
      }, 400);
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [loadSongAtIndex]);

  // Load first song on initial mount
  useEffect(() => {
    loadSongAtIndex(0, false);
  }, []); // Run once on mount

  // Change Genre / Vibe
  const changeVibe = useCallback(
    (newVibeId: VibeId) => {
      setUserInteracted(true);
      setVibeId(newVibeId);
      const newPlaylist = getPlaylistForGenre(newVibeId);
      setPlaylist(newPlaylist);
      failCountRef.current = 0;
      setCurrentIndex(0);

      // Stop current playback cleanly
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
      }

      // Load first song of new genre and play
      setTimeout(() => {
        const entry = newPlaylist[0];
        if (entry) {
          setIsLoading(true);
          resolveSong(entry).then((song) => {
            if (song && song.streamUrl && audioRef.current) {
              setCurrentSong(song);
              setDuration(song.duration || 0);
              audioRef.current.src = song.streamUrl;
              audioRef.current.load();
              setIsLoading(false);
              audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
            } else {
              loadSongAtIndex(0, true);
            }
          });
        }
      }, 50);
    },
    [resolveSong, loadSongAtIndex]
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
          .then(() => setIsPlaying(true))
          .catch((err) => console.warn("[VYBE] Play failed:", err));
      }
    }
  }, [isPlaying, currentSong, currentIndex, loadSongAtIndex]);

  const play = useCallback(() => {
    setUserInteracted(true);
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentSong || !audio.src) {
      loadSongAtIndex(currentIndex, true);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("[VYBE] Play failed:", err));
    }
  }, [currentSong, currentIndex, loadSongAtIndex]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

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

  // Adapt currentSong / playlist entry to `Track` format expected by FloatingPlayer
  const activeEntry = playlist[currentIndex] || {
    jiosaavnId: "default",
    title: "VYBE Radio",
    artist: "Selecting vibe...",
  };

  const track: Track = {
    id: currentSong?.id || activeEntry.jiosaavnId,
    title: currentSong?.title || activeEntry.title,
    artist: currentSong?.artist || activeEntry.artist,
    duration: duration || currentSong?.duration || 180,
    cover: currentSong?.artwork || "/covers/default.jpg",
    streamUrl: currentSong?.streamUrl,
    accent: theme.accent,
  };

  const currentDuration = duration > 0 ? duration : track.duration;
  const clampedTime = Math.min(
    currentDuration,
    Math.max(0, currentTime)
  );

  return {
    vibeId,
    theme,
    track,
    isPlaying,
    isLoading,
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
