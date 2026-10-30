# SpaceRemind

Also follow ~/ai-brain/AGENTS.md.

## Purpose
Mobile-first app for tracking where things are stored: locations, places, items with photos, QR and NFC tags, and reminders.

## Stack
Vanilla JS, Tailwind and Vite; Firebase (Firestore, Storage, Auth); Capacitor for Android.

## How to run, test and build
- `npm install`, then `npm run dev`
- `npm run build`, `npm run preview`
- Rules: `firebase deploy --only firestore:rules,firestore:indexes,storage`

No test script is defined in `package.json`.

## Folder map
`src/` app code (`api`, `components`, `utils`, `views`), `android/` Capacitor project, `public/` static assets, `scripts/` icon generation, `schema.md` data model.

## Project rules
- `.env` holds Firebase keys and is git-ignored. Don't read it into chat.
- Security rules and indexes are version-controlled: change them in the repo, then deploy.
