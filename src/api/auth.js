// Authentication for SpaceRemind — Google & Email sign-in via Firebase Auth.
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase.js";

import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error(
        "Google login client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file."
      );
    }

    await GoogleSignIn.initialize({
      clientId: clientId,
    });

    const result = await GoogleSignIn.signIn();
    if (!result || !result.idToken) {
      throw new Error("No ID Token returned from native Google Sign-in.");
    }

    const credential = GoogleAuthProvider.credential(result.idToken);
    return signInWithCredential(auth, credential);
  }
  return signInWithPopup(auth, provider);
}

export function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signOutUser() {
  return signOut(auth);
}

// Subscribe to auth changes. Calls cb(user | null) immediately and on change.
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
