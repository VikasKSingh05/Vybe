import type { Track, VibeId, VibeTheme } from "./types";

const tracks: Record<Exclude<VibeId, "all">, Track[]> = {
  phonk: [
    {
      id: "phonk-1",
      title: "Midnight Drift",
      artist: "KAVARI",
      duration: 198,
      cover: "/covers/phonk-1.jpg",
      accent: "#c41e3a",
    },
    {
      id: "phonk-2",
      title: "Neon Cathedral",
      artist: "DRIFT PHONK",
      duration: 214,
      cover: "/covers/phonk-2.jpg",
      accent: "#8b2252",
    },
    {
      id: "phonk-3",
      title: "Concrete Prayer",
      artist: "SHDW",
      duration: 187,
      cover: "/covers/phonk-3.jpg",
      accent: "#4a1942",
    },
  ],
  lofi: [
    {
      id: "lofi-1",
      title: "Rain on Glass",
      artist: "Nujabes Spirit",
      duration: 245,
      cover: "/covers/lofi-1.jpg",
      accent: "#c4956a",
    },
    {
      id: "lofi-2",
      title: "Late Night Pages",
      artist: "Idealism",
      duration: 198,
      cover: "/covers/lofi-2.jpg",
      accent: "#8b7355",
    },
    {
      id: "lofi-3",
      title: "Warm Static",
      artist: "Kupla",
      duration: 221,
      cover: "/covers/lofi-3.jpg",
      accent: "#6b8cae",
    },
  ],
  bollywood: [
    {
      id: "bollywood-1",
      title: "Mujhse Mohabbat Ka Izhaar",
      artist: "Satrang Music Official",
      duration: 256,
      cover: "/covers/bollywood-1.jpg",
      accent: "#e85d04",
    },
    {
      id: "bollywood-2",
      title: "Raat Bhar",
      artist: "Anuv Jain",
      duration: 234,
      cover: "/covers/bollywood-2.jpg",
      accent: "#d4a017",
    },
    {
      id: "bollywood-3",
      title: "Gulabi Aankhein",
      artist: "The Local Train",
      duration: 267,
      cover: "/covers/bollywood-3.jpg",
      accent: "#2d6a4f",
    },
  ],
  indie: [
    {
      id: "indie-1",
      title: "Golden Hour Drive",
      artist: "Still Woozy",
      duration: 203,
      cover: "/covers/indie-1.jpg",
      accent: "#c9b458",
    },
    {
      id: "indie-2",
      title: "Wildflower Season",
      artist: "Beach House",
      duration: 278,
      cover: "/covers/indie-2.jpg",
      accent: "#7d9b76",
    },
    {
      id: "indie-3",
      title: "Dust & Daylight",
      artist: "Big Thief",
      duration: 241,
      cover: "/covers/indie-3.jpg",
      accent: "#8fa4b8",
    },
  ],
  chill: [
    {
      id: "chill-1",
      title: "Blue Hour Tide",
      artist: "Tycho",
      duration: 312,
      cover: "/covers/chill-1.jpg",
      accent: "#5b8fa8",
    },
    {
      id: "chill-2",
      title: "Coastal Dreams",
      artist: "Bonobo",
      duration: 289,
      cover: "/covers/chill-2.jpg",
      accent: "#9b8ec4",
    },
    {
      id: "chill-3",
      title: "Horizon Fade",
      artist: "Emancipator",
      duration: 265,
      cover: "/covers/chill-3.jpg",
      accent: "#e8a598",
    },
  ],
};

export const vibeThemes: VibeTheme[] = [
  {
    id: "all",
    label: "ALL",
    background: "/backgrounds/bg-default.jpg",
    overlay: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)",
    accent: "#e07a3a",
    tracks: [
      tracks.bollywood[0],
      tracks.lofi[0],
      tracks.indie[0],
      tracks.chill[0],
      tracks.phonk[0],
    ],
  },
  {
    id: "phonk",
    label: "PHONK",
    background: "/backgrounds/bg-phonk.jpg",
    overlay:
      "linear-gradient(180deg, rgba(10,0,15,0.35) 0%, rgba(0,0,0,0.7) 100%)",
    accent: "#c41e3a",
    tracks: tracks.phonk,
  },
  {
    id: "lofi",
    label: "LO-FI",
    background: "/backgrounds/bg-lofi.jpg",
    overlay:
      "linear-gradient(180deg, rgba(20,12,8,0.3) 0%, rgba(0,0,0,0.65) 100%)",
    accent: "#c4956a",
    tracks: tracks.lofi,
  },
  {
    id: "bollywood",
    label: "BOLLYWOOD",
    background: "/backgrounds/bg-bollywood.jpg",
    overlay:
      "linear-gradient(180deg, rgba(30,10,5,0.25) 0%, rgba(0,0,0,0.6) 100%)",
    accent: "#e85d04",
    tracks: tracks.bollywood,
  },
  {
    id: "indie",
    label: "INDIE",
    background: "/backgrounds/bg-indie.jpg",
    overlay:
      "linear-gradient(180deg, rgba(15,20,10,0.3) 0%, rgba(0,0,0,0.6) 100%)",
    accent: "#c9b458",
    tracks: tracks.indie,
  },
  {
    id: "chill",
    label: "CHILL",
    background: "/backgrounds/bg-chill.jpg",
    overlay:
      "linear-gradient(180deg, rgba(5,15,30,0.3) 0%, rgba(0,0,0,0.65) 100%)",
    accent: "#5b8fa8",
    tracks: tracks.chill,
  },
];

export function getVibeTheme(id: VibeId): VibeTheme {
  return vibeThemes.find((v) => v.id === id) ?? vibeThemes[0];
}

export function getAllTracks(): Track[] {
  return vibeThemes.flatMap((v) => v.tracks);
}

export function findTrackById(id: string): Track | undefined {
  return getAllTracks().find((t) => t.id === id);
}

export function getNextTrack(
  currentId: string,
  vibeId: VibeId,
): Track | undefined {
  const theme = getVibeTheme(vibeId);
  const index = theme.tracks.findIndex((t) => t.id === currentId);
  if (index === -1) return theme.tracks[0];
  return theme.tracks[(index + 1) % theme.tracks.length];
}

export function getPrevTrack(
  currentId: string,
  vibeId: VibeId,
): Track | undefined {
  const theme = getVibeTheme(vibeId);
  const index = theme.tracks.findIndex((t) => t.id === currentId);
  if (index === -1) return theme.tracks[0];
  return theme.tracks[(index - 1 + theme.tracks.length) % theme.tracks.length];
}
