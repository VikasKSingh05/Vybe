import { searchJioSaavnSongs } from "./jiosaavn";
import type { Song } from "@/types/music";
import type { VibeId } from "@/data/types";

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

const VIBE_SEEDS: Record<VibeId, string[]> = {
  phonk: ["phonk music", "drift phonk", "phonk beats", "memphis rap"],
  lofi: ["lofi beats", "lofi hip hop", "chill lofi", "study lofi"],
  bollywood: ["bollywood hits", "romantic bollywood", "bollywood party songs", "90s bollywood hits"],
  indie: ["indie hindi songs", "indie pop", "indie rock", "acoustic hindi"],
  chill: ["chill english songs", "chill vibes", "relaxing music", "chill acoustic"],
  random: SEED_TERMS,
};

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
  if (arr.length === 0) return [];
  const take = Math.max(0, count);
  if (take === 0) return [];
  return shuffleArray(arr).slice(0, take);
}

function dedupeByTitleArtist(songs: Song[]): Song[] {
  const seen = new Set<string>();
  const result: Song[] = [];
  for (const song of songs) {
    const key = `${song.title}-${song.artist}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(song);
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discoverSongsForVibe(
  vibe: VibeId,
  count: number,
  excludeIds: Set<string> = new Set(),
): Promise<Song[]> {
  const pool = VIBE_SEEDS[vibe] ?? VIBE_SEEDS.random;
  const requested = Math.max(1, count);
  const seedCount = Math.max(1, Math.min(pool.length, Math.ceil(requested / 5)));
  const seeds = pickRandom(pool, seedCount);
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

  const unique = allResults.filter((song) => song.streamUrl && !excludeIds.has(song.id));
  const deduped = dedupeByTitleArtist(unique);
  return shuffleArray(deduped).slice(0, requested);
}

export async function discoverRandomSongs(
  count: number,
  excludeIds: Set<string> = new Set(),
): Promise<Song[]> {
  return discoverSongsForVibe("random", count, excludeIds);
}
