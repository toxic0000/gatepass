<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GatePass

Guest-access management for gated communities. Residents create time-limited guest
passes (QR code + 6-char short code); security validates them at the gate and logs
entries; community admins manage residents.

The 2026-07 rehaul (four roles: Super Admin, Community Admin, Security,
Resident) is **complete** — `docs/REHAUL.md` holds the design, the decisions
log, and per-phase verification notes. Consult it before changing auth,
tenancy, or role behavior.

## Stack

- Next.js 16 App Router, React 19, Tailwind 4
- Prisma 5 + PostgreSQL (hosted on Railway; `DATABASE_URL` in `.env`). The
  pre-rehaul code used SQLite (`prisma/dev.db`) — the switch happens in Phase 0
  of the rehaul (see `docs/REHAUL.md`).
- **In production on Railway** (app + Postgres in one project). Pushing to
  `main` auto-deploys via the GitHub integration — only push verified work.
  `railway.json` runs `npx prisma migrate deploy` pre-deploy, so migrations
  ship with the push that needs them.
- ⚠️ The local `.env` `DATABASE_URL` points at the **production** database
  (Railway public URL). Destructive Prisma commands (`migrate reset`,
  `db push --force-reset`, deleting rows) hit real data — ask before running
  them, and clean up any test rows you create.
- All pages are `"use client"` components fetching from `/api/*` route handlers.
  No server components with data or server actions so far.

## Commands

- `npm run dev` — dev server at http://localhost:3000. Known quirk on this
  Windows machine: long dev sessions can leak Turbopack `postcss.js` node
  worker processes until the machine runs out of RAM (500s / crashed builds).
  Fix: kill the leaked workers, delete `.next`, restart.
- `npx prisma migrate dev --name <name>` — create + apply a migration
- `npx prisma db seed` — seed demo data (`prisma/seed.ts` prints demo logins/links)
- `npm run lint`

## Layout

- `app/page.tsx` — landing page linking to the portals
- `app/resident/[token]/` — resident portal (magic-link token, no credentials):
  create passes, QR, history; disabled residents/communities get a blocking screen
- `app/security/` + `walkin/` + `login/` — gate portal (SECURITY role): scan QR /
  short code, log entries, walk-in passes
- `app/admin/` — community admin login + tabbed dashboard (residents with
  disable+note and cap enforcement, entry log, security users)
- `app/superadmin/` — super admin login + dashboard (communities, limits,
  enable/disable)
- `app/api/*` — route handlers mirroring the sections above; everything except
  the resident-token endpoints and `/api/auth/login` requires a role session,
  and every query is scoped by `communityId`
- `app/api/auth/` — shared staff login/logout (all roles, one `session` cookie)
- `lib/db.ts` — Prisma singleton · `lib/auth.ts` — scrypt password hashing,
  HMAC-signed cookie sessions, `requireRole()` guard · `lib/qr.ts` — QR data URLs

## Domain model (`prisma/schema.prisma`)

Community → User (role enum: SUPER_ADMIN | COMMUNITY_ADMIN | SECURITY;
`communityId` null for super admins); Community → Resident → GuestPass → Entry.
Residents have no credentials — their magic-link `token` is their auth.
Passes are valid 2 hours from creation and are looked up by cuid `id` or `shortCode`.

## Conventions

- Route params are async: `{ params }: { params: Promise<{ id: string }> }` — await them
- Auth checks sit at the top of each route handler (no proxy/middleware file):
  `requireRole(req, "ROLE")` from `lib/auth.ts`, then scope queries by
  `user.communityId`. Cross-community lookups return 404, not 403.
- API errors: `NextResponse.json({ error }, { status })`
- `react-hooks/set-state-in-effect` is disabled in `eslint.config.mjs` — the
  fetch-on-mount pattern here trips it falsely (see comment in the config)
- UI: dark slate theme, emerald (security/resident) and violet (admin) accents,
  `rounded-2xl` cards — match the existing pages
