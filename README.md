# VYBE

> One station. One world.

VYBE is an immersive music app built around two headline features:

- **VYBE LIVE** — one global radio station shared by every listener.
- **VYBE Jam** — private, synchronized listening rooms for you and your friends.

Vibes are no longer separate channels. They are visual themes and discovery
seeds: pick the look you want while VYBE LIVE keeps playing without interruption.

---

## ✨ Features

### 📻 VYBE LIVE

VYBE LIVE is a single, server-authoritative broadcast. Everyone connected to
VYBE hears the same track at the same point in the song.

- One shared station, not five per-vibe stations and no separate "Random" channel
- Server-owned timeline with synchronized position on join/reconnect
- Fresh JioSaavn discoveries mixed with curated seed tracks
- Automatic refill ahead of time so the station never runs out of music
- Failed tracks enter a cooldown instead of looping
- Skip/complete actions are version-checked so double-clicks advance once
- Search results and queued songs stay local to your player; the global broadcast remains shared

Vibes such as Bollywood, Indie, Lofi, Chill, and Phonk only change the visual
theme and influence discovery. Switching vibes never restarts the broadcast.

---

### 🔎 Music Search

Search for a song, artist, or track from any theme.

- Ranked JioSaavn results with duplicate suppression
- Retryable error state when the upstream API is unavailable
- Play immediately, add to your queue, or play next
- Highest available stream resolved through the server-side provider boundary

VYBE uses a separately deployed JioSaavn HTTP API (`JIOSAAVN_API_URL`). Spotifyd
is intentionally not used: it is a headless Spotify Connect daemon that requires
Spotify Premium and a Linux host, not a catalog/search API.

---

### 🎉 VYBE Jam

Create a listening room and share a synchronized session with friends.

- Create or join a room by link/code
- `hostId` is the single source of truth for host authority
- Deterministic host handover when the host leaves
- Shared queue, skip, seek, reactions, and activity feed
- Stable member identity across reconnects
- SSE state replay after a stream reconnect

Jam is designed so stale events cannot overwrite newer room state, including
when a member leaves or the host handover races with another mutation.

---

### 🎨 Modern UI

- Dynamic vibe-based theming (visuals only)
- Album artwork and cinematic background treatments
- Floating player with queue, settings, and media-session controls
- Responsive desktop and mobile layout
- Reduced-motion support

---

## 🏗️ Architecture

```text
                      ┌───────────────────────────┐
                      │       VYBE (Next.js)      │
                      │  UI + /api route handlers │
                      └─────────────┬─────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
     ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
     │ VYBE LIVE      │    │ VYBE Jam       │    │ Music provider │
     │ /api/radio/*   │    │ /api/party/*   │    │ /api/music/*   │
     └───────┬────────┘    └───────┬────────┘    └───────┬────────┘
             │                     │                     │
             └──────────┬──────────┘                     ▼
                        ▼                       ┌────────────────┐
              ┌────────────────┐               │ JioSaavn API   │
              │ Shared state   │               │ (separate host)│
              │ Redis (prod)   │               └────────────────┘
              └────────────────┘
```

The frontend and BFF live in this repository. The JioSaavn API is deployed
separately. Shared state is in-process memory for local development; production
uses Redis via `REDIS_URL`.

---

## 🛠️ Tech Stack

### App

- Next.js App Router + React
- TypeScript
- Tailwind CSS
- Lucide React

### BFF / services

- Next.js Route Handlers: `/api/radio/*`, `/api/party/*`, `/api/music/*`
- JioSaavn provider boundary with relevance-ranked search
- Redis-backed radio and party state via `REDIS_URL` (required in production)
- Server-Sent Events for Jam room updates

### Development

- Vitest
- ESLint
- TypeScript (`tsc --noEmit`)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ (or Bun)
- Git

### Install

```bash
git clone https://github.com/VikasKSingh05/vybe.git
cd vybe
npm install
```

Copy `.env.example` to `.env.local` and fill it in:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
JIOSAAVN_API_URL=https://your-jiosaavn-api.example
# REDIS_URL=rediss://...   # required for production; optional for local dev
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

### ✅ Checks

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # production build
```

---

## 🧪 Testing locally

### VYBE LIVE

Open VYBE in two tabs (or two devices on the same network). Both players should
show the same current track and position. Skip from one tab and confirm the
other follows. A double-click on skip should advance the station only once.

### VYBE Jam

Start a Jam room on one device and open the invite URL on another. Confirm the
queue, host controls, and member list stay in sync. The host leaving should
hand off cleanly to a deterministic successor instead of leaving a hostless room.

Local in-memory state is intended for development. It does not survive cold
starts or span multiple server instances; set `REDIS_URL` for real deployments.

---

## 🧭 Deployment

The Next.js app (frontend + BFF) deploys to platforms such as Vercel. The
JioSaavn API and Redis instance are deployed separately:

```text
                 ┌──────────────────────┐
                 │  VYBE (Vercel)       │
                 │  Next.js App + BFF   │
                 └──────────┬───────────┘
                            │ HTTPS
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │ JioSaavn    │ │ Redis       │ │ Browser     │
     │ API         │ │ shared state│ │ SSE / poll  │
     └─────────────┘ └─────────────┘ └─────────────┘
```

See [DEPLOY.md](./DEPLOY.md) for the full runbook.

---

## 🤝 Contributing

Contributions and suggestions are welcome.

## 📜 License

- Intended for educational and personal use.
- VYBE is not affiliated with or endorsed by any music streaming platform.
- Music availability and playback depend on the underlying sources and their terms.
- JioSaavn is an unofficial upstream; availability may change without notice.

## 👨‍💻 Author

Vikas Kumar Singh — built with ❤️ and a lot of music.

⭐ If you like VYBE, consider giving the repository a star.
