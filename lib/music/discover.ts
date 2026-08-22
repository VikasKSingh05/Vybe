import { searchJioSaavnSongs } from "./jiosaavn";
import type { Song } from "@/types/music";

const SEED_TERMS = [
  "hindi sad songs",
  "punjabi party hits",
  "lofi beats hindi",
  "indie hindi songs",
  "romantic bollywood",
  "workout motivation hindi",
  "chill english songs",
  "tamil melody hits",
  "telugu trending songs",
  "retro bollywood classics",
  "EDM hindi remix",
  "acoustic guitar hindi",
  "hip hop desi",
  "sufi songs hindi",
  "monsoon rain songs",
  "90s bollywood hits",
  "english pop hits",
  "korean drama OST",
  "japanese city pop",
  "brazilian funk beats",
  "afrobeat grooves",
  "spanish reggaeton hits",
  "turkish pop songs",
  "arabic chill vibes",
  "french cafe music",
  "italian romantic songs",
  "marathi pop hits",
  "gujarati garba songs",
  "bengali romantic hits",
  "kannada trending songs",
  "malayalam melodic hits",
  "hindi rock songs",
  "bass boosted hindi",
  "aesthetic lo-fi mix",
  "midnight drive songs",
  "heartbreak english songs",
  "happy vibes playlist",
  "energetic workout mix",
  "study focus music",
  "sleep ambient hindi",
];

const SEARCH_DELAY_MS = 200;

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffleArray(arr).slice(0, count);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discoverRandomSongs(
  count: number,
  excludeIds: Set<string> = new Set(),
): Promise<Song[]> {
  const seeds = pickRandom(SEED_TERMS, Math.min(3, Math.ceil(count / 5)));
  const allResults: Song[] = [];

  for (let i = 0; i < seeds.length; i++) {
    if (i > 0) await sleep(SEARCH_DELAY_MS);
    try {
      const songs = await searchJioSaavnSongs(seeds[i]);
      allResults.push(...songs);
    } catch {
      // skip failed seed
    }
  }

  const unique = allResults.filter(
    (song) => song.streamUrl && !excludeIds.has(song.id),
  );

  return shuffleArray(unique).slice(0, count);
}
