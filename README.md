# SpaceRemind

A mobile-first Progressive Web App for tracking **where your stuff is stored**.
Define hierarchical locations, catalogue items with photos, generate QR codes /
write NFC tags for each storage place, then scan or tap to instantly see what's
inside.

## User flow

1. **Setup** — create a *Location* (e.g. Kitchen) and a *Place* (e.g. Under Sink Cabinet).
2. **Catalogue** — add items with names and a photo gallery.
3. **Tag** — generate a QR code (print it) or write an NFC tag for the Place.
4. **Retrieve** — scan the QR / tap the tag to open that Place's inventory.

Plus **reminders** attached to any item or place.

## Stack

- **Frontend:** Vanilla JS, HTML5, Tailwind CSS
- **Bundler:** Vite
- **Backend:** Firebase — Firestore (database) + Storage (photos) + Auth (Google sign-in)
- **APIs:** [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) (scanning), `qrcode` (generation), Web NFC

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Firebase web app keys
npm run dev
```

In the [Firebase console](https://console.firebase.google.com/): create a project,
enable **Google** sign-in (Authentication), create a **Firestore** database, and
enable **Storage**. Copy the web app config values into `.env`.

### Deploy Firestore rules & indexes

The security rules and composite indexes live in version control. Deploy them
with the Firebase CLI (`npm i -g firebase-tools`, then `firebase login`):

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

- `firestore.rules` — per-user `ownerId` access control
- `firestore.indexes.json` — composite indexes for the app's queries
- `storage.rules` — authenticated, image-only photo uploads

## PWA

SpaceRemind is an installable, offline-capable PWA (via `vite-plugin-pwa`):

- App shell is precached; a service worker auto-updates on new deploys.
- Firebase Storage photos are runtime-cached (cache-first).
- Firestore uses IndexedDB persistence, so previously-loaded data works offline.

Icons are generated from `assets/icon.svg`:

```bash
npm run icons   # writes public/icons/*.png
```

## Project structure

```
src/
├── api/          firebase.js · auth.js · places.js (Firestore) · storage.js
├── components/   ui.js · Header.js · SignIn.js · AppShell.js
├── views/        Home.js · Place.js · Scan.js · Reminders.js
├── utils/        qrcode.js (gen + scan) · nfc.js (Web NFC)
├── router.js     hash router + QR/NFC deep-link handling
└── main.js       auth gate + bootstrap
```

See [`schema.md`](./schema.md) for the Firestore data model and security rules.

## Notes

- **Web NFC** works only on Chrome for Android over HTTPS; the UI hides NFC
  actions where unsupported.
- The camera scanner and NFC require a secure context (HTTPS or `localhost`).
- `vercel.json` preps a Vite SPA deployment (build → `dist`, SPA rewrites).
