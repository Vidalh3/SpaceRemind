// Firebase initialization for SpaceRemind.
// Reads config from Vite env vars (see .env.example). Initialize once and
// export the shared Firestore + Storage handles for the rest of the app.
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// True only once the Vite env vars (see .env.example) are filled in.
export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// When credentials aren't set up, provide stub exports so the module
// loads cleanly — main.js will show the "configure Firebase" screen before
// any stub is ever actually called.
export let app, auth, db, storage;

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Firestore with offline persistence (IndexedDB), shared across browser tabs,
  // so cached data stays available without a connection.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  storage = getStorage(app);
}

// Current user's UID, used as ownerId on every document. Returns null when
// signed out — callers should guard against that before writing.
export function currentUid() {
  return auth?.currentUser?.uid ?? null;
}
