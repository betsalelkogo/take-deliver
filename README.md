# Take & Deliver 📦

A dead-simple board for coordinating package pickups in a group.

- Anyone with a package posts it: **pickup location, package number, contact details, notes**.
- Anyone heading to that location taps **"I'm going here — take N"** to become the courier and claim everything waiting there.
- No more endless _"is anyone going to ___?"_ chat messages.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS** and **Firebase Firestore** (real-time updates). Designed to deploy to **Vercel** in a couple of minutes.

---

## How it works

| Role | Action |
| --- | --- |
| Package owner | Click **Post a package**, fill in location + details. It shows as _Waiting for pickup_. |
| Courier | Find the location, click **I'm going here — take N**, enter your name/phone. Packages become _Courier assigned_. |
| Either | Mark a claimed package **Delivered**, **Release** it back, or **Delete** it. |

Everything updates live across devices via Firestore.

---

## 1. Set up Firebase (free tier is plenty)

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Inside the project, open **Build → Firestore Database → Create database**. Start in **production mode** (we'll add rules below).
3. Open **Project settings (gear icon) → General → Your apps → Web app (`</>`)** and register an app. Copy the `firebaseConfig` values.
4. Apply the security rules from [`firestore.rules`](./firestore.rules):
   - In the console go to **Firestore Database → Rules**, paste the file contents, and **Publish**.
   - ⚠️ The default rules make this an **open board** (anyone with the link can read/write). That's fine for a small trusted group. For wider use, enable Firebase Auth and uncomment the hardened rules at the bottom of the file.

## 2. Run locally

```bash
npm install
cp .env.example .env.local   # then paste your Firebase web config values
npm run dev
```

Open http://localhost:3000. Until `.env.local` is filled in, the app shows a setup notice instead of the board.

Your `.env.local` should look like:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=my-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
```

> These `NEXT_PUBLIC_*` values are client-side identifiers (the browser needs them), **not secrets**. Access control is enforced by your Firestore Security Rules, not by hiding these keys. Still, never commit `.env.local` — it's already in `.gitignore`.

## 3. Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com/new), **Import** the repo (it auto-detects Next.js — no build config needed).
3. Under **Settings → Environment Variables**, add the same six `NEXT_PUBLIC_FIREBASE_*` variables.
4. **Deploy.** Share the URL with your group.

To redeploy after changing env vars, trigger a new deployment so they're baked into the client build.

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
  layout.tsx           # shell, header/footer (Hebrew, RTL)
  page.tsx             # landing hero + board
  globals.css          # Tailwind + shared component classes
components/
  PackageBoard.tsx     # subscribes to Firestore, groups by area→store, tabs/filters
  PackageForm.tsx      # "post a package" form (area/store picker)
  PackageRow.tsx       # collapsible package row (take, note, whatsapp, actions)
  ManageStores.tsx     # add/remove pinned stores per area
  IdentityForm.tsx     # "who am I" (saved locally for one-click claims)
  Modal.tsx            # lightweight modal
lib/
  firebase.ts          # Firebase app/Firestore init from env vars
  packages.ts          # package types + Firestore CRUD + realtime subscription
  locations.ts         # areas + pinned stores (Firestore)
  identity.ts          # local (device) identity hook
  whatsapp.ts          # phone formatting + wa.me message builder
firestore.rules        # security rules to paste into the Firebase console
```

## Data model (`packages` collection)

| Field | Type | Notes |
| --- | --- | --- |
| `area` | string | First-level area; used to group packages |
| `store` | string | Pinned or ad-hoc store within the area |
| `description` | string | Short title (≤40 chars) |
| `packageNumber` | string | Tracking / locker code |
| `ownerName` / `ownerPhone` | string | Who needs it picked up + contact |
| `notes` | string | Free text |
| `status` | `available` \| `claimed` \| `delivered` | |
| `courierName` / `courierPhone` | string \| null | Set when taken |
| `courierNote` | string | Collector's drop-off note (when/where) |
| `createdAt` / `deliveredAt` | timestamp | Server timestamps |

The `stores` collection holds pinned stores: `{ area, name, createdAt }`.

## Possible next steps

- Add **Firebase Authentication** (e.g. Google sign-in) and lock writes to signed-in users.
- Add ETA / pickup time to a claim.
- Notify owners via email/Telegram in addition to WhatsApp.
```
