/**
 * Backwards-compatible façade. The implementation now lives behind the
 * MusicProvider boundary in `lib/music/providers/jiosaavn.ts`; keeping these
 * exports avoids churn in older call sites and tests.
 */
export {
  fetchJioSaavnSong,
  searchJioSaavnSongs,
} from "./providers/jiosaavn";
