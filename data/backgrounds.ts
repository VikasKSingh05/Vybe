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
    overlay: "linear-gradient(180deg, rgba(20,12,8,0.35) 0%, rgba(0,0,0,0.7) 100%)",
    accent: "#c4956a",
    description: "Cozy rainy apartment desk illuminated by a warm lamp with distant city lights.",
  },
  bollywood: {
    id: "bollywood",
    label: "BOLLYWOOD",
    background: "/backgrounds/bg-indie.jpg",
    overlay: "linear-gradient(180deg, rgba(28,8,4,0.35) 0%, rgba(0,0,0,0.72) 100%)",
    accent: "#e85d04",
    description: "Nostalgic evening neighborhood with a chai stall, vintage scooter, and vermillion glow.",
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
