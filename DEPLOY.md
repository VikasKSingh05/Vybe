# Deploying VYBE

VYBE has two shared-state surfaces: **VYBE LIVE** (the single global radio
station) and **VYBE Jam** (private rooms). Both use the same Redis connection in
production.

| Piece | Hosts | Notes |
|---|---|---|
| Frontend + BFF (this repo) | **Vercel** | Next.js app; `/api/*` route handlers |
| JioSaavn music API | **Render** | Search/song resolution (`JIOSAAVN_API_URL`) |
| Shared radio + Jam state | Redis (`REDIS_URL`) | Required in production; in-memory only for local dev |

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables (and in
`.env.local` for development):

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | yes | Canonical origin for metadataBase, OG tags, robots, sitemap |
| `JIOSAAVN_API_URL` | yes | Base URL of the JioSaavn API |
| `REDIS_URL` | **yes in production** | Shared state for VYBE LIVE and VYBE Jam (Upstash or any ioredis-compatible Redis) |

`NEXT_PUBLIC_*` values are baked at build time — changing them requires a redeploy.

Without `REDIS_URL`, both stores fall back to per-process memory. That is fine
for a single local dev process, but serverless functions can scale across
instances; a different instance would see a different station timeline or a
missing Jam room.

`ioredis` is pinned into the radio and party function bundles with
`outputFileTracingIncludes`, so no extra bundling config is needed on Vercel.

## Shared state on serverless

### VYBE LIVE

- One Redis key holds the single station timeline.
- Mutations use `WATCH`/`MULTI`/`EXEC` compare-and-swap.
- Skip, complete, failure reports, and duration reports carry the client's last
  seen `version`; stale actions return the current wire instead of advancing.
- Clients poll `/api/radio` and seek to `expectedPositionMs` from
  `serverNowMs`, so listeners converge after a reconnect or a dropped event.
- Failed tracks are kept out of rotation for a 10-minute cooldown.

### VYBE Jam

- SSE streams (`/api/party/[roomId]/stream`) declare `maxDuration = 60`.
- When the platform ends an invocation, clients auto-reconnect and the server
  replays full room state. Users may see a brief "reconnecting" state.
- `hostId` is authoritative; host handover is deterministic and mutations are
  serialized/CAS-protected so stale member events cannot revive an old host.
- On Pro you can raise `maxDuration` (for example to `300`) for longer
  uninterrupted streams.

## Build & run

```bash
npm install
npm run build        # production build
npm start            # serve it

node scripts/generate-icons.mjs   # only needed after changing app/icon.png
```

## Checks before shipping

- [ ] `NEXT_PUBLIC_APP_URL` matches the real domain
- [ ] `JIOSAAVN_API_URL` is publicly reachable over HTTPS
- [ ] `REDIS_URL` is set for the production environment and accepts TLS if required
- [ ] Two tabs/devices show the same VYBE LIVE track and position
- [ ] A double skip advances VYBE LIVE only once
- [ ] A Jam host handover leaves exactly one host
- [ ] Manifest icons load: `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`
- [ ] Lighthouse → Installable passes (manifest + service worker)

## Disclaimer

VYBE uses an unofficial JioSaavn HTTP API. Availability and terms are controlled
by that upstream; this project is for personal/educational use and is not
affiliated with any music streaming platform.
