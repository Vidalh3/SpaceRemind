// spaces.js — Spaces and Household Collaboration API.
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth, currentUid } from "./firebase.js";

const HOUSEHOLDS = "households";
const ACTIVE_SPACE_KEY = "spaceremind_active_space_id";

// Get household owned by the current user
export async function getOwnedHousehold() {
  const uid = currentUid();
  if (!uid) return null;
  const snap = await getDocs(
    query(collection(db, HOUSEHOLDS), where("ownerId", "==", uid))
  );
  return snap.empty ? null : snap.docs[0];
}

// Get household where the current user is an invited member
export async function getJoinedHousehold() {
  const email = auth.currentUser?.email;
  if (!email) return null;
  const snap = await getDocs(
    query(collection(db, HOUSEHOLDS), where("memberEmails", "array-contains", email.toLowerCase()))
  );
  return snap.empty ? null : snap.docs[0];
}

// Create a new shared household space
export async function createHousehold(name) {
  const uid = currentUid();
  if (!uid) throw new Error("Not signed in.");
  
  // Verify no household is already owned
  const existing = await getOwnedHousehold();
  if (existing) throw new Error("You already own a shared household.");

  return addDoc(collection(db, HOUSEHOLDS), {
    ownerId: uid,
    name,
    memberEmails: [],
    createdAt: serverTimestamp(),
  });
}

// Invite a family member to the household (limit 3 members)
export async function inviteMember(householdId, email) {
  const uid = currentUid();
  if (!uid) throw new Error("Not signed in.");

  const ref = doc(db, HOUSEHOLDS, householdId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Household not found.");
  
  const household = snap.data();
  if (household.ownerId !== uid) throw new Error("Only the owner can invite members.");

  const currentMembers = household.memberEmails || [];
  if (currentMembers.length >= 3) {
    throw new Error("You can invite up to 3 members only.");
  }
  
  const normalizedEmail = email.trim().toLowerCase();
  if (currentMembers.includes(normalizedEmail)) {
    throw new Error("User is already invited.");
  }

  await updateDoc(ref, {
    memberEmails: arrayUnion(normalizedEmail),
  });

  return generateInviteMailUrl(normalizedEmail, household.name);
}

// Switch current active Space ID
export function getActiveSpaceId() {
  const uid = currentUid();
  if (!uid) return null;
  const cached = localStorage.getItem(ACTIVE_SPACE_KEY);
  // Default to private space if cached ID is missing or invalid
  if (cached && (cached.startsWith("private_") || cached.length > 5)) {
    return cached;
  }
  return `private_${uid}`;
}

export function setActiveSpaceId(spaceId) {
  localStorage.setItem(ACTIVE_SPACE_KEY, spaceId);
}

// List all spaces the active user has access to
export async function listAvailableSpaces() {
  const uid = currentUid();
  if (!uid) return [];
  
  const list = [
    { id: `private_${uid}`, name: "Private Space", type: "private" }
  ];

  try {
    const owned = await getOwnedHousehold();
    if (owned) {
      list.push({ id: owned.id, name: owned.data().name, type: "shared" });
    }

    const joined = await getJoinedHousehold();
    if (joined) {
      list.push({ id: joined.id, name: `${joined.data().name} (Shared)`, type: "shared" });
    }
  } catch (err) {
    console.error("Failed to load spaces list:", err);
  }

  return list;
}

// Helper to generate mailto draft fallback invitation link
export function generateInviteMailUrl(email, householdName) {
  const subject = encodeURIComponent(`Join my SpaceRemind Household: ${householdName}`);
  const body = encodeURIComponent(
    `Hi!\n\nI've invited you to join my shared home space "${householdName}" on SpaceRemind.\n\nPlease sign up or log in using this email address at https://spaceremind.app to access our shared locations and places.\n\nBest regards!`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
