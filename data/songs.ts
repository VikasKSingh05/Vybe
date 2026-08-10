import type { Track, VibeId } from "./types";

export const songsByGenre: Record<Exclude<VibeId, "all">, Track[]> = {
  phonk: [
    { id: "phonk-01", title: "METAMORPHOSIS", artist: "INTERWORLD", duration: 142, youtubeId: "lJvRohYSrZM", accent: "#8b2252" },
    { id: "phonk-02", title: "Close Eyes", artist: "DVRST", duration: 132, youtubeId: "ao4RCon11eY", accent: "#4a1942" },
    { id: "phonk-03", title: "Bohemian Rhapsody", artist: "Queen", duration: 354, youtubeId: "fJ9rUzIMcZQ", accent: "#c41e3a" },
    { id: "phonk-04", title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", duration: 270, youtubeId: "OPf0YbXqDm0", accent: "#9b111e" },
    { id: "phonk-05", title: "Sugar", artist: "Maroon 5", duration: 235, youtubeId: "09R8_2nJtjg", accent: "#a52a2a" },
    { id: "phonk-06", title: "Counting Stars", artist: "OneRepublic", duration: 257, youtubeId: "hT_nvWreIhg", accent: "#7f1734" },
    { id: "phonk-07", title: "Hello", artist: "Adele", duration: 295, youtubeId: "YQHsXMglC9A", accent: "#b22222" },
    { id: "phonk-08", title: "Roar", artist: "Katy Perry", duration: 233, youtubeId: "CevxZvSJLk8", accent: "#800020" },
    { id: "phonk-09", title: "Just The Way You Are", artist: "Bruno Mars", duration: 220, youtubeId: "LjhCEhWiKXk", accent: "#990000" },
    { id: "phonk-10", title: "All Star", artist: "Smash Mouth", duration: 237, youtubeId: "L_jWHffIx5E", accent: "#660000" },
  ],
  lofi: [
    { id: "lofi-01", title: "Lofi Hip Hop Radio (Beats to Relax)", artist: "Lofi Girl", duration: 300, youtubeId: "jfKfPfyJRdk", accent: "#e8a0bf" },
    { id: "lofi-02", title: "Lofi Sleep Beats", artist: "Lofi Girl", duration: 300, youtubeId: "DWcJFNfaw9c", accent: "#c4956a" },
    { id: "lofi-03", title: "Resonance", artist: "HOME", duration: 212, youtubeId: "8GW6sLrK40k", accent: "#d4a373" },
    { id: "lofi-04", title: "Chill Study Beats", artist: "Lofi Girl", duration: 300, youtubeId: "5qap5aO4i9A", accent: "#a2d2ff" },
    { id: "lofi-05", title: "Relaxing Rain Beats", artist: "Chillhop Music", duration: 300, youtubeId: "7NOSDKb0HlU", accent: "#b8c0ff" },
  ],
  bollywood: [
    { id: "bollywood-01", title: "Tum Hi Ho", artist: "Arijit Singh", duration: 262, youtubeId: "Umqb9KENgmk", accent: "#d4943a" },
    { id: "bollywood-02", title: "Kesariya", artist: "Arijit Singh", duration: 268, youtubeId: "BddP6PYo2gs", accent: "#d4a017" },
    { id: "bollywood-03", title: "Channa Mereya", artist: "Arijit Singh", duration: 289, youtubeId: "bzSTpdcs-EI", accent: "#2d6a4f" },
    { id: "bollywood-04", title: "Apna Bana Le", artist: "Arijit Singh", duration: 261, youtubeId: "ElZfdU54Cp8", accent: "#e85d04" },
    { id: "bollywood-05", title: "Tune Jo Na Kaha", artist: "Mohit Chauhan", duration: 310, youtubeId: "dTu5dTEzVM4", accent: "#dc2f02" },
  ],
  indie: [
    { id: "indie-01", title: "Apocalypse", artist: "Cigarettes After Sex", duration: 290, youtubeId: "sElE_BfQ67s", accent: "#d4b24c" },
    { id: "indie-02", title: "Viva La Vida", artist: "Coldplay", duration: 242, youtubeId: "dvgZkm1xWPE", accent: "#7d9b76" },
    { id: "indie-03", title: "Somebody That I Used To Know", artist: "Gotye", duration: 244, youtubeId: "8UVNT4wvIGY", accent: "#8fa4b8" },
    { id: "indie-04", title: "Reptilia", artist: "The Strokes", duration: 219, youtubeId: "b8-tXG8KrWs", accent: "#c9ada7" },
    { id: "indie-05", title: "Havana", artist: "Camila Cabello", duration: 217, youtubeId: "HCjNJDNzw8Y", accent: "#9a8c98" },
    { id: "indie-06", title: "On & On", artist: "Cartoon, Jéja (NCS)", duration: 207, youtubeId: "K4DyBUG242c", accent: "#4a4e69" },
    { id: "indie-07", title: "Blinding Lights", artist: "The Weeknd", duration: 200, youtubeId: "fHI8X4OXluQ", accent: "#22223b" },
    { id: "indie-08", title: "See You Again", artist: "Wiz Khalifa ft. Charlie Puth", duration: 230, youtubeId: "RgKAFK5djSk", accent: "#52796f" },
  ],
  chill: [
    { id: "chill-01", title: "Baby", artist: "Justin Bieber", duration: 220, youtubeId: "kffacxfA7G4", accent: "#5b8fa8" },
    { id: "chill-02", title: "Despacito", artist: "Luis Fonsi", duration: 228, youtubeId: "kJQP7kiw5Fk", accent: "#9b8ec4" },
    { id: "chill-03", title: "Finesse (Remix)", artist: "Bruno Mars ft. Cardi B", duration: 217, youtubeId: "LsoLEjrDogU", accent: "#e8a598" },
    { id: "chill-04", title: "Smells Like Teen Spirit", artist: "Nirvana", duration: 301, youtubeId: "hTWKbfoikeg", accent: "#b5e2fa" },
    { id: "chill-05", title: "Shape of You", artist: "Ed Sheeran", duration: 233, youtubeId: "JGwWNGJdvx8", accent: "#edafb8" },
    { id: "chill-06", title: "Stayin' Alive", artist: "Bee Gees", duration: 250, youtubeId: "I_izvAbhExY", accent: "#f7d6e0" },
    { id: "chill-07", title: "Girls Like You", artist: "Maroon 5", duration: 270, youtubeId: "aJOTlE1K90k", accent: "#f2b5d4" },
  ],
};

// Master list combining all genre tracks so ALL vibe plays randomly across the entire catalog!
export const allSongs: Track[] = [
  ...songsByGenre.phonk,
  ...songsByGenre.lofi,
  ...songsByGenre.bollywood,
  ...songsByGenre.indie,
  ...songsByGenre.chill,
];
