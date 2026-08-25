# Deploying VYBE

Current production architecture:

| Piece | Hosts | Notes |
|---|---|---|
| Frontend + BFF (this repo) | **Vercel** | Next.js app; `/api/*` routes proxy upstream services |
| JioSaavn music API | **Render** | Search / song-resolution backend (`JIOSAAVN_API_URL`) |
| Party room state | In-process memory, or Redis via `REDIS_URL` | See "Parties on serverless" below |

## Environment variables

Set in Vercel → Project → Settings → Environment Variables (and in `.env.local` for dev):

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | yes | Canonical origin for metadataBase, OG tags, robots/sitemap |
| `JIOSAAVN_API_URL` | yes | Base URL of the Render-hosted JioSaavn API |
| `REDIS_URL` | no | Externalizes party state (Upstash or any ioredis-compatible Redis). Unset = per-process memory |

`NEXT_PUBLIC_*` values are baked at build time — changing them requires a redeploy.

## Parties on serverless

Two constraints to know about when running on Vercel:

1. **Function duration.** The SSE stream route (`/api/party/[roomId]/stream`)
   declares `maxDuration = 60`. When the platform ends an invocation, clients
   auto-reconnect and the server replays full room state, so nothing desyncs —
   users just see a brief "reconnecting" state. On Pro you can raise the value
   (e.g. `300`) for longer uninterrupted sessions.
2. **State locality.** Without `REDIS_URL`, party rooms live in one function
   instance's memory. This works while traffic stays warm on a single
   instance, but a cold start or scale-out event can make a room temporarily
   unfindable. When party usage grows, create an Upstash database and set
   `REDIS_URL` — no code changes required.

## Build & run

```bash
npm install
npm run build        # production build
npm start            # serve it

node scripts/generate-icons.mjs   # only needed after changing app/icon.png
```

## Checks before shipping

- [ ] `NEXT_PUBLIC_APP_URL` matches the real domain (OG images, sitemap)
- [ ] `JIOSAAVN_API_URL` points at the Render service and is publicly reachable over HTTPS
- [ ] Manifest icons load: `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`
- [ ] Lighthouse → Installable passes (manifest + service worker)
- [ ] Host a party from two devices against the deployment; confirm queue sync survives ~60s+ idle sessions
