# Court booking SaaS — product brief

**Owner:** Jamey Short  
**Working title:** TBD (candidates: LockCourt, ThatsMyCourt)  
**Updated:** 2026-11-05  
**Positioning:** Multi-club subscription product for reserving recreation court space (tennis, pickleball, and other court amenities). Sold to clubs; players use a free app / mobile web experience.

> **Not a Doublegate product.** Doublegate, Reserve My Court (RMC), and MatchTime are **research only**. Seed/demo data uses a generic **Demo Club**.

---

## Problem

Clubs already pay for court booking tools, but players and staff fight the UX:

- Mobile booking is slow (one court at a time, too many taps, weak edit).
- Directors and captains waste time on **multi-court blocks** and **recurring series** (edit/delete court-by-court).
- Team ops (availability, messaging, lineups) live in a separate app from the courts.

## Research notes (not customers / not branding)

### RMC — director pains (Allyce Holloway, Nov 5, 2026)

1. Recurring lessons with skipped weeks → delete unwanted weeks **court by court**.
2. Multi-court blocks → change a shared note (e.g. team name) **court by court**.

Category pricing context: one observed RMC Standard plan ~$360/year for 10 amenities (research only).

### MatchTime — team ops without courts

MatchTime covers seasons, player availability, messaging, lineups, scores, and calendar sync. It does **not** book live club courts. Captains typically juggle MatchTime (team) + RMC (courts). Product opportunity: bridge **availability → lineup/practice → reserve the courts → confirm** in one place (Phase 3).

---

## Users & roles

| Role | Needs |
|------|--------|
| **Club admin** | Amenities, booking rules, member approval, rain-outs / blocks, club profile |
| **Member / player** | See all courts for a day, book / cancel / edit fast (mobile-first) |
| **Team captain** | Roster, availability, practices, messaging, lineups tied to real court reservations |
| **Director** (optional elevated) | Multi-court / recurring lesson blocks with shared notes (often overlaps admin + captain) |

---

## Product principles

1. **Clubs pay** (web subscription via Stripe later). Players are free.
2. **Out-UX competitors**, don’t out-feature them early: all-courts day grid, 2-tap book, real edit, multi-court + recurring as one object.
3. **Multi-club from day one** in data model; single Demo Club in the scaffold.
4. **PWA / mobile web first**; App Store / Play shells after core works.
5. Optional **QR walk-up** (per-court deep link) is a later differentiator — not the brand.

---

## Phases (locked)

### Phase 1 — Admin portal / settings

Club can configure the product before members live on it.

- Amenity / court list (create, rename, reorder, type, enable/disable)
- Booking rules (advance window, open/close hours, min/max duration, max concurrent courts, cancel cutoff)
- Member management (invite, approve / reject, roles, deactivate)
- **Mass member import** at initial setup (CSV / spreadsheet: email, name, optional role) with per-row success/error report
- Club settings (name, timezone, location, contact)
- Admin blocks / rain-outs on amenities
- Basic “who’s on which court” overview for staff

**Scaffold note:** Current code is an early **member** day-grid UI. That work is kept as a prototype and will be **reordered under Phase 2**. Phase 1 admin screens/APIs are the next build focus.

### Phase 2 — Member portal & experience

- Auth (member login; club association)
- Day grid: **all amenities on one screen**
- Book / cancel / **edit** (web + mobile web / PWA)
- Multi-court reservation as **one object** (one note, one edit, one cancel)
- Recurring series with **skip / remove specific dates**
- Email confirmations + reminders
- Optional later in Phase 2+: QR deep link per court

### Phase 3 — Team captain functionality

- Teams / seasons / roster
- Player availability for matches / practices
- Team messaging
- Practice schedules that **create/link court reservations** (incl. multi-court)
- Lineups with times, tied to booked courts where applicable
- Bridge the MatchTime-style ops gap without abandoning court inventory

### Later (productize)

- Multi-club onboarding, subscription billing (club pays on web), App Store / Play shells, name + domain lock, notifications beyond email, fees/wallet if clubs demand it

---

## Explicitly out of early phases

Clinics marketplace, POS, marketing blasts, native store apps before PWA proves out, charging players inside iOS for club SaaS.

---

## Phase 1 checklist — screens & APIs

### Screens (admin-only)

1. **Admin home / dashboard** — pending member approvals count, today’s blocks, quick links
2. **Amenities** — list + create/edit (name, type, sort order, active); soft-disable without deleting history
3. **Booking rules** — form bound to club settings (advance days, hours, durations, caps, cancel cutoff)
4. **Members** — directory; pending queue; approve / reject / change role / deactivate
5. **Club settings** — name, city/state, timezone, optional contact email
6. **Blocks / rain-outs** — block amenity for a date/time range with reason
7. **Members → Bulk import** — upload CSV/XLSX (columns: `email`, `name`, optional `role`); download template; column mapping; **preview + validate** before commit; options: send invites now vs. import as active/pending; result report (imported / skipped duplicates / errored rows with reason, e.g. bad email, unknown role, missing name) + downloadable error CSV to fix and re-upload. Surfaced in first-run setup flow and on Members page.
8. **Schedule overview (read-only admin)** — optional thin view of today’s bookings (full member UX stays Phase 2)

### APIs (suggested)

| Method | Path | Purpose |
|--------|------|---------|
| `GET/PATCH` | `/api/admin/club` | Club profile + timezone |
| `GET/PATCH` | `/api/admin/rules` | Booking rules for club |
| `GET/POST` | `/api/admin/amenities` | List / create amenity |
| `GET/PATCH/DELETE` | `/api/admin/amenities/[id]` | Update / disable amenity |
| `GET` | `/api/admin/members` | Members + pending (`?status=pending`) |
| `POST` | `/api/admin/members/invite` | Invite by email |
| `POST` | `/api/admin/members/import/preview` | Parse + validate file; return per-row status (valid / duplicate / error + reason), no writes |
| `POST` | `/api/admin/members/import` | Commit valid rows (idempotent on email per club); optional send invites; returns counts + row errors |
| `GET` | `/api/admin/members/import/template` | CSV template (`email,name,role`) |
| `POST` | `/api/admin/members/[id]/approve` | Approve |
| `POST` | `/api/admin/members/[id]/reject` | Reject |
| `PATCH` | `/api/admin/members/[id]` | Role / deactivate |
| `GET/POST` | `/api/admin/blocks` | List / create rain-out or hold |
| `DELETE` | `/api/admin/blocks/[id]` | Remove block |

Auth: session required; role `ADMIN` or `DIRECTOR` for all `/api/admin/*`. Enforce club scoping on every query.

### Data model additions (Phase 1)

- Extend `Club` with timezone, booking-rule fields (or `ClubRules` 1:1), optional contact
- `Membership` / member `status`: `PENDING` | `ACTIVE` | `REJECTED` | `DISABLED` (today’s `User` may gain `status`)
- `Amenity` may replace or alias `Court` naming in UI (“amenity” in admin; “court” still fine in player language)
- Optional `MemberImport` (clubId, createdBy, createdAt, totals, errorRows JSON) for audit / re-download of error report
- Import rules: email required + valid + unique per club; name required; role ∈ `MEMBER` | `DIRECTOR` | `ADMIN` (default `MEMBER`); max rows per file (e.g. 2,000)
- `CourtBlock` (amenityId, startAt, endAt, reason, createdBy)

### Phase 1 done when

Admin can stand up **Demo Club**: define amenities, set rules, **bulk-import its member list from a CSV (with clear row-level errors)**, approve a member, place a rain-out — without using the member booking UI.

---

## Current scaffold status

- Early member UI exists: login, day grid, single-court book/edit/cancel, My reservations
- Demo seed renamed to **Demo Club** (not Doublegate)
- `groupId` / `seriesId` on reservations reserved for Phase 2 multi-court + recurring
- **Do not treat current UI as Phase 1 complete** — rebuild priority is admin portal first

## Open decisions

- Product name + domain
- Hosting + Apple / Google developer accounts (owner)
- Pricing tiers (by amenity count vs flat)
- Whether “Director” stays a distinct role or folds into Admin + Captain
