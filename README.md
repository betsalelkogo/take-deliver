# Take & Deliver 📦

A dead-simple board for coordinating package pickups in a group.

- Anyone with a package posts it: **pickup location, package number, contact details, notes**.
- Anyone heading to that location taps **"I'm going here — take N"** to become the courier and claim everything waiting there.
- No more endless _"is anyone going to ___?"_ chat messages.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS** and **Neon Postgres**. Designed to deploy to **Vercel** in a couple of minutes.

---

## How it works

| Role | Action |
| --- | --- |
| Package owner | Click **Post a package**, fill in location + details. It shows as _Waiting for pickup_. |
| Courier | Find the location, click **I'm going here — take N**, enter your name/phone. Packages become _Courier assigned_. |
| Either | Mark a claimed package **Delivered**, **Release** it back, or **Delete** it. |

Open boards refresh every 10 seconds (and right away when you come back to the tab), so changes show up on other devices within seconds.

---

## 1. Set up Neon (free tier is plenty)

1. Create a project in the [Neon Console](https://console.neon.tech/).
2. Copy the **pooled** connection string from **Dashboard → Connect**.

The database is only ever reached from the Next.js API routes (`app/api/...`), never from the browser, so the connection string is a real secret: keep it in `.env` / Vercel env vars only and never prefix it with `NEXT_PUBLIC_`.

## 2. Run locally

```bash
npm install
cp .env.example .env   # then set NEON_DB_URL
npm run db:schema      # creates the tables (safe to re-run)
npm run dev
```

Open http://localhost:3000.

## 3. Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com/new), **Import** the repo (it auto-detects Next.js — no build config needed).
3. Under **Settings → Environment Variables**, add `NEON_DB_URL` (or connect the Neon integration and point `NEON_DB_URL` at its pooled URL).
4. **Deploy.** Share the URL with your group.

## Who can do what

The server decides, not the browser:

- Each device gets a random `td_device` cookie (HttpOnly). Posts, claims and
  rides store a hash of it (`owner_key`, `courier_key`, `rider_key`), and only
  that device can manage them.
- Only the owner can delete a package or edit/close a post. The owner or the
  courier can release a claim; only the courier writes the pickup note; only
  the owner confirms the package was received.
- Phone numbers are sent only to the people on that package or ride. An open
  trip's number is visible to the whole board, since that's how people join.
  Leaderboards return names and counts only.
- Rows created before ownership existed have no key; they are matched by the
  phone the device saved in «מי אני?» until they expire off the board.
- Writes are rate limited per person and per IP (Postgres counters in
  `rate_limits`), and rejected if they come from another site's page.

After pulling these changes, run `npm run db:schema` once (it only adds
columns and a table) **before** deploying.

## Tests

`npm test` compiles `tests/` with `tsc` and runs them with Node's built-in
test runner (no extra dependencies). They cover the permission rules, phone
redaction and rate limiting.

## Legal pages

`/accessibility`, `/privacy` and `/terms` are linked from every page's footer.
Fill in the operator name and contact details in `lib/legal.ts` before
publishing, and have someone qualified review the text.

## Moving from Firebase

The app used to keep everything in Firestore. `npm run migrate:firestore` copies it all into Neon (Kerem Reim's root collections and every `communities/{id}` subtree), creating the schema first. It reads Firestore through its public REST API, so it needs `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_API_KEY` in `.env`.

1. `npm run migrate:firestore` — Firestore overwrites matching rows in Neon.
2. Deploy the Neon version.
3. `npm run migrate:firestore -- --only-new` — picks up anything posted on the old version in the meantime, without overwriting changes already made in Neon.
4. Publish [`firestore.rules`](./firestore.rules) so the old version can no longer write. Firestore keeps the old data as a read-only backup.

---

## Notifying owners on WhatsApp

When a neighbour taps **"אני לוקח"**, the package shows a green **WhatsApp** button. Tapping
it opens WhatsApp (from the collector's own phone) prefilled with a message to the owner —
"היי X, אני Y ואוסף לך את החבילה…" — and the collector just hits send. No API, dedicated
number, or paid service required.

---

## Project structure

```
app/
  layout.tsx           # html shell (Hebrew, RTL)
  page.tsx             # community picker (redirects to the device's last community)
  c/[communityId]/     # one community's boards
  api/communities/     # JSON API (the only code that talks to the database)
  globals.css          # Tailwind + shared component classes
components/
  CommunityPicker.tsx  # list/search communities + open a new one
  CommunityHome.tsx    # loads a community, header (invite / switch), boards
  PackageBoard.tsx     # polls the board, groups by area→store, tabs/filters
  PackageForm.tsx      # "post a package" form (area/store picker)
  PackageRow.tsx       # collapsible package row (take, note, whatsapp, actions)
  ManageStores.tsx     # add/remove pinned stores per area
  IdentityForm.tsx     # "who am I" (saved locally for one-click claims)
  Modal.tsx            # lightweight modal
lib/
  api.ts               # fetch wrapper + polling used by the browser
  communities.ts       # community API calls + the device's saved community
  packages.ts          # package types + API calls
  locations.ts         # areas + pinned stores
  identity.ts          # local (device) identity hook
  whatsapp.ts          # phone formatting + wa.me message builder
  server/              # server-only: Neon queries, request validation (zod)
db/schema.sql          # tables + indexes (applied by `npm run db:schema`)
scripts/               # schema + one-off Firestore migration
firestore.rules        # read-only rules for the old Firestore backup
```

## Communities

Each community (a village, neighbourhood or building) has its own board at
`/c/{communityId}`. Anyone can open one for free from the home page.

- A community can't be renamed or deleted from the app, and names are unique
  (case-insensitive).
- Every other table has a `community_id` that references `communities`, so
  data can't be written to a community that doesn't exist.
- **Kerem Reim** (`kerem-reim`) predates communities, so it is the only one
  with fixed areas and destinations (stored on its `communities` row).

## Data model

See [`db/schema.sql`](./db/schema.sql) for the full definitions.

| Table | Holds |
| --- | --- |
| `communities` | Name, plus fixed areas/destinations (Kerem Reim only) |
| `packages` | Area/store, details, owner, status (`available` / `claimed`), collector, `close_ms` (publish → claim) |
| `stores` | Pinned stores per area |
| `transfers` | Ride requests/offers (`open` / `matched` / `closed`) |
| `community_stats` | All-time collected count + close-time totals for the average |
| `scores` | Collector / publisher leaderboards |
| `rate_limits` | Per-person / per-IP request counters (pruned after a day) |

Old entries are cleaned up when a board is loaded: claimed packages after 2
days, untaken ones after 30 days, open transfers after 7 days, done ones after 2.

## Possible next steps

- SMS (InforU) for urgent packages only, since it has a quota.
- Web push notifications through the existing service worker.
- An offline page in the service worker.
- Editing a pinned store's hours without removing and re-adding it.
```
