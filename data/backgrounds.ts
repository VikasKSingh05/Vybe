import type { VibeId } from "./types";

export interface BackgroundTheme {
  id: VibeId;
  label: string;
  background: string;
  overlay: string;
  accent: string;
  description: string;
}

export const backgroundThemes: Record<VibeId, BackgroundTheme> = {
  all: {
    id: "all",
    label: "ALL",
    background: "/backgrounds/fields.jpg",
    overlay: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.68) 100%)",
    accent: "#e07a3a",
    description: "Cinematic golden hour Indian street with vintage warmth and nostalgic architecture.",
  },
  phonk: {
    id: "phonk",
    label: "PHONK",
    background: "/backgrounds/bg-phonk.jpg",
    overlay: "linear-gradient(180deg, rgba(12,0,18,0.4) 0%, rgba(0,0,0,0.78) 100%)",
    accent: "#c41e3a",
    description: "Underground brutalist city with crimson neon reflections and dark grit.",
  },
  lofi: {
    id: "lofi",
    label: "LO-FI",
    background: "/backgrounds/lofi.png",
    overlay: "linear-gradient(180deg, rgba(30,10,25,0.35) 0%, rgba(0,0,0,0.72) 100%)",
    accent: "#e8a0bf",
    description: "Cozy pink-lit anime bedroom with city skyline view and warm lo-fi atmosphere.",
  },
  bollywood: {
    id: "bollywood",
    label: "BOLLYWOOD",
    background: "/backgrounds/bolly.jpg",
    overlay: "linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(0,0,0,0.75) 100%)",
    accent: "#d4943a",
    description: "Bright anime cityscape with warm sunlit buildings and a vivid blue sky.",
  },
  indie: {
    id: "indie",
    label: "INDIE",
    background: "/backgrounds/mountains.jpg",
    overlay: "linear-gradient(180deg, rgba(15,20,10,0.3) 0%, rgba(0,0,0,0.68) 100%)",
    accent: "#d4b24c",
    description: "Nostalgic summer road trip through golden fields towards distant mountains.",
  },
  chill: {
    id: "chill",
    label: "CHILL",
    background: "/backgrounds/chill.jpg",
    overlay: "linear-gradient(180deg, rgba(5,15,30,0.35) 0%, rgba(0,0,0,0.72) 100%)",
    accent: "#5b8fa8",
    description: "Dreamy coastal ocean at blue hour with silhouette palm trees and gentle waves.",
  },
};
