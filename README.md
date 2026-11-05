# Court Booking SaaS

Working title TBD (LockCourt / ThatsMyCourt are name candidates only). Multi-club court reservation product for tennis, pickleball, and other court amenities. Clubs pay; players use it free.

**Not a Doublegate product.** Doublegate, Reserve My Court, and MatchTime are research only. Demo data is **Demo Club**.

See [PRODUCT-BRIEF.md](./PRODUCT-BRIEF.md).

## Locked phases

1. **Admin portal / settings** — amenities, booking rules, members, CSV/XLSX import, club settings, blocks / rain-outs, read-only schedule
2. **Member portal** — day grid, book / cancel / edit, multi-court + recurring (early prototype is already in this repo)
3. **Team captain** — availability, messaging, practices and lineups tied to courts

Out of scope for now: Stripe, multi-club billing, App Store shells, QR walk-up.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite (`DATABASE_URL`; swap to Postgres later)
- Auth.js / NextAuth credentials (email + password)
- Spreadsheet import via SheetJS (`xlsx`)

## Setup

```bash
npm install
cp .env.example .env
# set AUTH_SECRET to a long random string
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run db:push` | Apply schema to SQLite |
| `npm run db:seed` | Reset Demo Club seed data |
| `npm run db:reset` | Wipe SQLite and reseed |
| `npm test` | Phase 1 service and import tests |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Default logins

Password for every active seeded account: **`password123`**

| Email | Role |
|-------|------|
| `admin@democlub.local` | Admin — lands on the admin portal |
| `director@democlub.local` | Director — same admin portal |
| `member@democlub.local` | Member — day schedule |
| `member2@democlub.local` | Member |
| `pending@democlub.local` | Pending approval, no password |

Admins and directors can still open Schedule, Book, and Mine. Members cannot open `/admin`.

## Phase 1 admin portal

| Screen | Path |
|--------|------|
| Dashboard / setup checklist | `/admin` |
| Amenities (create, rename, reorder, type, disable) | `/admin/amenities` |
| Booking rules | `/admin/rules` |
| Members (invite, approve, reject, role, deactivate) | `/admin/members` |
| Bulk CSV / XLSX import | `/admin/members/import` |
| Blocks and rain-outs | `/admin/blocks` |
| Read-only schedule | `/admin/schedule` |
| Club settings | `/admin/settings` |

### APIs

Session required. Role must be `ADMIN` or `DIRECTOR`. Every query is scoped to that user's club.

| Method | Path |
|--------|------|
| `GET` / `PATCH` | `/api/admin/club` |
| `GET` / `PATCH` | `/api/admin/rules` |
| `GET` / `POST` | `/api/admin/amenities` |
| `GET` / `PATCH` / `DELETE` | `/api/admin/amenities/[id]` (`DELETE` disables; it does not remove history) |
| `GET` | `/api/admin/members` (`?status=pending`) |
| `POST` | `/api/admin/members/invite` |
| `POST` | `/api/admin/members/import/preview` |
| `POST` | `/api/admin/members/import` |
| `GET` | `/api/admin/members/import/template` |
| `POST` | `/api/admin/members/[id]/approve` |
| `POST` | `/api/admin/members/[id]/reject` |
| `PATCH` | `/api/admin/members/[id]` |
| `GET` / `POST` | `/api/admin/blocks` |
| `DELETE` | `/api/admin/blocks/[id]` |

Import accepts `.csv`, `.xlsx`, and `.xls` (max 2,000 data rows, 5 MB). Required columns are `email` and `name`; `role` is optional (`MEMBER`, `DIRECTOR`, `ADMIN`, default `MEMBER`). Preview validates and writes nothing. Commit skips emails that already belong to the club. Modes:

- `pending` — roster row waiting for approval
- `active` — active roster row, still without a password
- `invite` — pending, with `invitedAt` set

Email delivery is not configured in this phase. Invites are recorded only. The import screen can download a failed-rows CSV (`row,email,name,role,error`) and a full report.

Booking rules (advance window, open/close, duration, concurrent courts, cancel cutoff) apply to **member** bookings. Staff can place reservations outside those caps. Nobody can book over an existing reservation, a block, or a disabled amenity.

Deactivated, rejected, and pending accounts cannot sign in. An existing session for someone who is later deactivated is signed out on the next page load.
