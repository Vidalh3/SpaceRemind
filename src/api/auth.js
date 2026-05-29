// Authentication for SpaceRemind — Google sign-in via Firebase Auth.
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase.js";

const provider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

// Subscribe to auth changes. Calls cb(user | null) immediately and on change.
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
