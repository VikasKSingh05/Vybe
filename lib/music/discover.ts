import { searchJioSaavnSongs } from "./jiosaavn";
import { normalizeForMatch } from "./ranking";
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
  "ghananai rap hits",
  "nigerian afrobeats hits",
  "kenyan genge music",
  "tropical house mix",
  "indie folk acoustic",
  "bollywood sufi classics",
  "hindi jazz fusion",
  "lofi rain sounds beats",
  "synthwave retro drive",
  "drill rap instrumentals",
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
  const seenIds = new Set<string>();
  const seenTracks = new Set<string>();
  const result: Song[] = [];
  for (const song of songs) {
    const idKey = song.id.trim().toLowerCase();
    const key = `${normalizeForMatch(song.title)}|${normalizeForMatch(song.artist)}`;
    if ((idKey && seenIds.has(idKey)) || seenTracks.has(key)) continue;
    if (idKey) seenIds.add(idKey);
    seenTracks.add(key);
    result.push(song);
  }
  return result;
}

/** Avoid playing three tracks by the same artist in a row when alternatives exist. */
function diversifyByArtist(songs: Song[]): Song[] {
  const buckets = new Map<string, Song[]>();
  for (const song of songs) {
    const artist = normalizeForMatch(song.artist) || "unknown";
    const bucket = buckets.get(artist) ?? [];
    bucket.push(song);
    buckets.set(artist, bucket);
  }

  const result: Song[] = [];
  while (result.length < songs.length) {
    let added = false;
    for (const artist of [...buckets.keys()]) {
      const bucket = buckets.get(artist);
      const next = bucket?.shift();
      if (!next) continue;
      result.push(next);
      added = true;
      if (bucket?.length === 0) buckets.delete(artist);
    }
    if (!added) break;
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
  return diversifyByArtist(shuffleArray(deduped)).slice(0, requested);
}

export async function discoverRandomSongs(
  count: number,
  excludeIds: Set<string> = new Set(),
): Promise<Song[]> {
  return discoverSongsForVibe("random", count, excludeIds);
}
