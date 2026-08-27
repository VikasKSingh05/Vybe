# VYBE

> Music that matches your mood.

VYBE is a modern music discovery and listening platform built around **moods, curated VYBES, and social listening**.

Instead of browsing through endless playlists, VYBE lets you choose a vibe and instantly start listening. You can also search for specific songs or join a **VYBE Jam** to listen together with friends in real time.

---

## ✨ Features

### 🎧 VYBE-based Music Discovery

Choose a vibe and let VYBE handle the music selection.

Available vibes include different moods and energy levels such as:

- 🌿 Lofi
- 🧘 Chill
- 🔥 Phonk
- 🎲 Random

Each VYBE provides a curated listening experience rather than requiring users to manually build a playlist.

---

### 🔎 Music Search

Don't want to follow a predefined vibe?

Search for a specific:

- Song
- Artist
- Track

VYBE resolves the requested track through its music API and plays the highest available audio quality.

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
### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- Lucide React
### Backend
- Bun
- Hono
- TypeScript
- Zod
### Development
- Git
- ESLint
- Vitest

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Node.js
- Bun
- Git

### Clone the repository

```bash
git clone https://github.com/VikasKSingh05/vybe.git
cd vybe
```
Install dependencies:

```bun install```

Environment Variables:
```NEXT_PUBLIC_API_URL=your_api_url```

Replace your_api_url with the URL of the VYBE music API.

Start development server:
```bun run dev```

VYBE will be available at:

http://localhost:3000

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

🧪 Development

The frontend can be deployed using platforms such as Vercel.
The backend can be deployed separately using a container-based platform.
The production architecture can therefore look like:

                ┌──────────────────┐
                │      VYBE        │
                │     Frontend     │
                └────────┬─────────┘
                         │
                         │ HTTPS
                         ▼
                ┌──────────────────┐
                │   VYBE Backend   │
                │   Hono + Bun     │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │                  │
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
