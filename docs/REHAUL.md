# GatePass Rehaul Plan

Living document. Update the phase checklists as work lands and record choices in the
decisions log. Last updated: 2026-07-03.

## Goal

Turn the single-community demo into a multi-tenant app with four sections:

```
Super Admin ──creates──> Community (+ Community Admin, resident limit)
Community Admin ──manages──> Residents, Security users, entry logs
Security ──validates──> Guest passes at the gate (unchanged + login)
Resident ──creates──> Guest passes (unchanged + login)
```

## Roles

### Super Admin (new)
- Creates communities and their Community Admin account(s)
- Sets per-community resident limit (`maxResidents`)
- Overview of all communities: resident count, admin count, security-user count
- Enables/disables a community (non-payment, left the program). A disabled
  community blocks logins and API access for everyone in it.

### Community Admin (rework of current `/admin`)
- Manage residents (existing), capped at `community.maxResidents` — enforced
  server-side, not just in the UI
- Enable/disable residents with an optional note (e.g. late fees); the note is
  shown to the resident when they try to access their portal
- View entry logs for their community (who entered, when, via which pass/resident)
- Create/manage Security users for their community

### Security (existing behavior unchanged, + login)
- Scan QR / short code, log entries, walk-in passes — as-is
- Add login; every query scoped to the security user's community

### Resident (existing behavior unchanged)
- Create guest passes, QR, history — as-is
- The magic link (`/resident/[token]`) stays the ONLY access method — no
  resident credentials. The link is generated when the Community Admin creates
  the resident.
- When disabled: portal blocked and the admin's note is displayed

## Database: PostgreSQL on Railway

The app deploys to Railway with a managed Postgres service. Phase 0 switches the
Prisma datasource from SQLite to `postgresql` and regenerates the migrations
folder from scratch (the existing migrations are SQLite dialect — delete
`prisma/migrations/` and re-init against Postgres; there is no production data
to preserve). Drop the unused `@libsql/client` / `@prisma/adapter-libsql`
dependencies. Local dev runs against a local Postgres (Docker) or a Railway dev
database — `DATABASE_URL` in `.env` either way.

## Data model changes (`prisma/schema.prisma`)

- Datasource: `provider = "postgresql"`
- `Community`: add `maxResidents Int @default(50)`, `isActive Boolean @default(true)`
- New `User` model replacing `CommunityAdmin`: `username`, `passwordHash`,
  `role Role` (Prisma `enum Role { SUPER_ADMIN COMMUNITY_ADMIN SECURITY }` —
  Postgres supports enums natively), `communityId String?` (null for super admins)
- `Resident`: add `isActive Boolean @default(true)`, `disabledNote String?`.
  Keep `token` (sole access method). Drop `passwordHash` (no resident login);
  keep `email` as optional contact info only.
- `Entry`: unchanged — community is derived via guestPass → resident → communityId

## Auth design

- Generalize `lib/admin-auth.ts` into `lib/auth.ts`: same scrypt hashing +
  HMAC-signed cookie sessions, payload becomes `{ userId, role, exp }`. Staff
  only (super admin / community admin / security) — residents have no sessions;
  their URL token is their auth.
- Every API route: authenticate → check role → scope the query by `communityId`.
  No cross-community data, ever.
- The "community is disabled" check lives in the shared auth helper so it applies
  to all staff/resident routes automatically.

## Enforcement rules

- Resident cap: checked in `POST /api/admin/residents` — only ACTIVE residents
  count against `maxResidents` (disabling a resident frees a slot)
- Disabled community: logins and APIs return 403 with an explanatory message
- Disabled resident: portal and pass creation blocked, `disabledNote` shown;
  security walk-in passes for a disabled resident are also blocked

## Known holes the rehaul fixes

- `/api/security/*` is completely unauthenticated and reads/writes across ALL
  communities
- `/api/security/entries` returns a global last-10 — must become per-community
  (and paginated/filterable for the admin log view)
- Deleting a resident cascades to their passes and entries, destroying the entry
  log. Once logs matter, disable becomes the primary action instead of delete.

## Phases

### Phase 0 — Foundations ✅ (code complete 2026-07-03)
- [x] Switch datasource to PostgreSQL: `provider = "postgresql"`, wipe
      `prisma/migrations/`, re-init migrations, drop libsql deps
- [x] Schema migration: `User` + `Role` enum, community `maxResidents`/`isActive`,
      resident `isActive`/`disabledNote`, drop `CommunityAdmin` and resident
      `passwordHash` (baseline migration `20260703000000_init` generated offline
      via `prisma migrate diff`)
- [x] `lib/auth.ts`: generalized sessions + role guards + disabled-community check
      (session cookie `session`; login/logout moved to `/api/auth/login|logout`,
      login responds with `role` and the client redirects per portal)
- [x] Update `prisma/seed.ts` for the new schema (superadmin/super123 —
      overridable via `SUPERADMIN_PASSWORD` —, admin/admin123,
      security/security123, demo community + residents)
- [x] Railway Postgres connected: `migrate deploy` + `db seed` applied and all
      endpoints smoke-tested against the live DB (2026-07-03)

### Phase 1 — Super Admin portal (`/superadmin`) ✅ (2026-07-03)
- [x] Login (`/superadmin`, sky accent, shared `/api/auth/login`, redirects by role)
- [x] Communities overview with counts (active residents vs limit, admins,
      security users) and status badge
- [x] Create community + its first Community Admin, set `maxResidents`
      (slug auto-generated from name, deduped; username conflicts → 409)
- [x] Edit `maxResidents` inline; enable/disable community (verified: disabling
      kills existing staff sessions immediately, login returns 403 with message)

### Phase 2 — Community Admin rework (`/admin`) ✅ (2026-07-03)
- [x] Enforce resident cap on create AND on re-enable (only active residents
      count; 403 with explanatory message)
- [x] Enable/disable resident + optional note (PATCH replaces the old DELETE —
      residents are disable-only now; enabling clears the note)
- [x] Entry log view (per-community via guestPass→resident→communityId,
      newest first, latest 100)
- [x] Security user management (create/remove, scoped to community, 409 on
      duplicate username)
- [x] (pulled from Phase 4) API enforcement: disabled resident/community can't
      create passes; walk-ins for disabled residents blocked
- [x] Dashboard reworked into tabs: Residents / Entry Log / Security

### Phase 3 — Security login ✅ (2026-07-03)
- [x] Login page (`/security/login`, emerald) + SECURITY-role guards on
      `/api/residents`, `/api/security/*`, `/api/passes/[id]` (lookup) and
      `/api/passes/[id]/entries` (logging); portal pages redirect to login on
      401 and got a logout button
- [x] All gate queries scoped by the security user's community — verified with
      a second community: passes, walk-ins and resident lists are invisible
      across communities (404, no existence leak). Residents list also excludes
      disabled residents.
- Note: QR codes encode the `/api/passes/[id]` URL, which now requires a
  security session — a guest scanning their own QR sees 401 JSON instead of
  pass data (an improvement; revisit if guests should get a friendly page).

### Phase 4 — Resident disabled UX ✅ (2026-07-03)
- [x] Disabled-resident screen showing the admin note (`/api/residents/[token]`
      returns 403 + `reason: "resident_disabled"` + `disabledNote`; the portal
      renders a dedicated screen with the admin's message highlighted)
- [x] Disabled-community screen (`reason: "community_disabled"`); a 403 during
      pass creation also reloads into the disabled screen
- [x] Remove resident credential leftovers — done back in Phase 0 (schema has
      no `passwordHash` on Resident; admin form has no password field)

### Phase 5 — Cleanup ✅ (2026-07-03)
- [x] Home page: demo links replaced with the three staff portal entries +
      a "Resident? Use your personal link" note
- [x] Lint clean: unescaped `'` fixed; `react-hooks/set-state-in-effect`
      disabled project-wide in `eslint.config.mjs` (false positive for this
      codebase's fetch-on-mount client components — rationale in the config)
- [x] Railway deploy config: `railway.json` with
      `preDeployCommand: npx prisma migrate deploy` + `npm start`; added
      `postinstall: prisma generate` so the client generates on Railway builds.
      The app service needs env vars: `DATABASE_URL` (internal URL via
      `${{Postgres.DATABASE_URL}}`), `SESSION_SECRET` (long random string),
      optionally `SUPERADMIN_PASSWORD` before seeding.
- [x] `AGENTS.md` and this doc updated

## Rehaul complete — 2026-07-03

All five phases done and verified against the Railway Postgres database.
**In production since 2026-07-03**: Railway project with Postgres + app
services, auto-deploying from `main`. The seeded demo credentials
(superadmin/super123 etc.) are live — rotate them before real use.
Deferred ideas: friendly page for guests who scan their own QR (currently 401
JSON), entry-log pagination/filtering, per-pass validity windows.

## Decisions log

- 2026-07-03: Single `User` table with a role string for all staff (super admin /
  community admin / security) instead of one table per role. Residents stay a
  separate model — they carry domain data (unit, token, passes), not credentials.
- 2026-07-03: Residents authenticate ONLY via magic link — no resident
  credentials. Remove `passwordHash` and the password form field; keep `email`
  as optional contact info.
- 2026-07-03: Single seeded Super Admin account (seed script / env credentials);
  no UI for managing super admins.
- 2026-07-03: Residents are disable-only — remove hard delete so entry logs are
  never destroyed. Disabled residents don't count against `maxResidents`.
- 2026-07-03: Database is PostgreSQL on Railway (deployment provider). SQLite
  was dev-only scaffolding; migrations are regenerated for Postgres in Phase 0,
  and the `Role` field becomes a native Prisma enum.

## Open questions

- None currently.
