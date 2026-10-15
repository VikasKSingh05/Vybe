# VYBE

> Music that matches your mood.

VYBE is a modern music discovery and listening platform built around **moods, curated VYBES, and social listening**.

Instead of browsing through endless playlists, VYBE lets you choose a vibe and instantly start listening. You can also search for specific songs or join a **VYBE Jam** to listen together with friends in real time.

---

## ✨ Features

### 🎧 VYBE-based Live Radio

Choose a vibe and VYBE keeps the music flowing like a live radio station.

Available vibes include different moods and energy levels such as:

- 🎬 Bollywood
- 🎸 Indie
- 🌿 Lofi
- 🧘 Chill
- 🔥 Phonk
- 🎲 Random

Each VYBE starts from a curated seed pool, then continuously discovers new
tracks for that vibe as you listen — so the station never loops a finite list
and never runs out of songs. New tracks are prefetched ahead of time and the
next song is preloaded for gapless transitions.

---

### 🔎 Music Search

Available in every vibe — don't want to follow the station?

Search for a specific:

- Song
- Artist
- Track

VYBE resolves the requested track through its music API and plays the highest available audio quality. Play a result immediately, queue it, or play it next.

---

### 🎉 VYBE Jam

Create a listening room and enjoy music with friends.

Jam allows multiple users to join the same room and share a synchronized listening experience.

#### Current Jam features

- Create a room
- Join using a room link/code
- Shared playback state
- Host-controlled playback
- Shared queue
- Add songs to the queue
- Remove songs
- Skip tracks
- Seek through tracks
- Volume controls
- Room member list
- Activity feed
- Reactions
- Invite friends

The Jam system is designed so that everyone in the room stays synchronized with the host's playback state.

---

### 🎨 Modern UI

VYBE uses a dark, immersive interface designed around the music experience.

The UI includes:

- Dynamic vibe-based theming
- Album artwork
- Floating music player
- Bento-style layouts
- Responsive design
- Smooth transitions
- Desktop and mobile support

---

## 🏗️ Architecture

VYBE is split into a frontend application and a music API backend.

```text
                    ┌──────────────────────┐
                    │       VYBE           │
                    │    Next.js App       │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
        ┌─────────────────┐        ┌─────────────────┐
        │ Music Discovery │        │    VYBE Jam     │
        │                 │        │                 │
        │ VYBES / Search  │        │ Rooms / Queue   │
        │ Playlists       │        │ Sync / Members  │
        └────────┬────────┘        └────────┬────────┘
                 │                          │
                 ▼                          ▼
        ┌─────────────────┐        ┌─────────────────┐
        │       API       │        │ Real-time Layer │
        └─────────────────┘        └─────────────────┘
```

## 🛠️ Tech Stack

This repository is the **frontend + BFF**: a Next.js (App Router) app whose
`/api/*` route handlers proxy the upstream music service.

### App
- Next.js (App Router) + React
- TypeScript
- Tailwind CSS
- Lucide React

### Backend / BFF
- Next.js Route Handlers (`/api/music/*`, `/api/party/*`)
- JioSaavn music API (separate upstream service, `JIOSAAVN_API_URL`)
- Party room state: per-process memory, or Redis via `REDIS_URL`

### Development
- Git
- ESLint
- Vitest
- TypeScript (`tsc --noEmit`)

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Node.js 20+ (or Bun)
- Git

### Clone the repository

```bash
git clone https://github.com/VikasKSingh05/vybe.git
cd vybe
```
Install dependencies:

```bash
npm install
```

Environment variables — copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
JIOSAAVN_API_URL=https://your-jiosaavn-api.example   # upstream music API
# REDIS_URL=rediss://...                             # optional; unset = in-memory party state
```

See `.env.example` and [DEPLOY.md](./DEPLOY.md) for the full list.

Start development server:

```bash
npm run dev
```

VYBE will be available at:

http://localhost:3000

### ✅ Checks

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # production build
```

### 🎉 Testing VYBE Jam Locally

To test Jam with another device on the same network:

- Start the development server.
- Find your computer's local IP address.
- Make sure both devices are connected to the same Wi-Fi/network.
- Open VYBE using your computer's local IP from the other device.

For example:
http://192.168.1.10:3000
Create a Jam room on one device and open the invite URL on another.
Note: Local in-memory rooms are intended for development/self-hosted environments. They are not suitable for persistent production rooms across server instances.

🧪 Deployment

The Next.js app (frontend + BFF) deploys to platforms such as Vercel; the
upstream JioSaavn music API is deployed separately and referenced via
`JIOSAAVN_API_URL`. See [DEPLOY.md](./DEPLOY.md) for the full runbook. The
production architecture can look like:

                ┌──────────────────┐
                │  VYBE (Vercel)   │
                │ Next.js App + BFF│
                └────────┬─────────┘
                         │
                         │ HTTPS
                         ▼
                ┌──────────────────┐
                │  JioSaavn API    │
                │ (Render, separate)│
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │     Sources      │
                └──────────────────┘

### 🤝 Contributing

Contributions and suggestions are welcome.

### 📜 License

- This project is intended for educational and personal use.
- VYBE is not affiliated with or endorsed by any music streaming platform.
- Music availability and playback depend on the underlying music sources and their respective terms.

### 👨‍💻 Author
Vikas Kumar Singh
Built with ❤️ and a lot of music.

⭐ Support
If you like VYBE, consider giving the repository a ⭐ on GitHub.

VYBE
Music discovery, reimagined around your mood.
