# GatePass

Guest-access management for gated communities. Residents create time-limited
guest passes (QR code + 6-character short code); security validates them at the
gate and logs entries; community admins manage residents; a super admin manages
communities.

## Portals

| Portal | Path | Who |
|---|---|---|
| Super Admin | `/superadmin` | Creates communities + their admins, sets resident limits, enables/disables communities |
| Community Admin | `/admin` | Manages residents (disable with a note, capped by limit), views entry logs, manages security users |
| Security | `/security` | Scans QR / short codes at the gate, logs entries, registers walk-ins |
| Resident | `/resident/<token>` | Personal magic link (no login): create passes, share QR/code, see entry history |

## Stack

- Next.js 16 (App Router) · React 19 · Tailwind 4
- Prisma 5 + PostgreSQL
- Auth: scrypt password hashing + HMAC-signed cookie sessions (`lib/auth.ts`)

## Local development

```bash
npm install
# .env: set DATABASE_URL to a PostgreSQL connection string
npx prisma migrate deploy
npx prisma db seed        # prints demo logins and resident links
npm run dev               # http://localhost:3000
```

Environment variables (`.env`):

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — HMAC secret for session cookies (falls back to a dev value)
- `SUPERADMIN_PASSWORD` — password for the seeded super admin (default `super123`)

## Deployment

Hosted on Railway (app + Postgres in one project). **Every push to `main`
auto-deploys to production** via the GitHub integration. `railway.json` runs
`npx prisma migrate deploy` as a pre-deploy step, so schema migrations ship
automatically with the code that needs them.

## Docs

- `AGENTS.md` — project conventions and architecture (for AI-assisted work)
- `docs/REHAUL.md` — design, decisions log, and verification notes from the
  2026-07 multi-tenant rehaul
