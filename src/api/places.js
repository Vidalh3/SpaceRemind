// Firestore data-access helpers for Locations, Places, Items, and Reminders.
// See schema.md for the full data model. Multi-user: every document carries
// an `ownerId` (the signed-in user's UID) and every query is scoped to it.
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, currentUid } from "./firebase.js";
import { deletePhoto } from "./storage.js";

const LOCATIONS = "locations";
const PLACES = "places";
const ITEMS = "items";
const REMINDERS = "reminders";

function requireUid() {
  const uid = currentUid();
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

// ---- Locations (e.g. "Kitchen") ----
export function listLocations() {
  const uid = requireUid();
  return getDocs(
    query(collection(db, LOCATIONS), where("ownerId", "==", uid), orderBy("name"))
  );
}

export function createLocation({ name }) {
  return addDoc(collection(db, LOCATIONS), {
    ownerId: requireUid(),
    name,
    createdAt: serverTimestamp(),
  });
}

// ---- Places (e.g. "Under Sink Cabinet") ----
export function getPlace(placeId) {
  return getDoc(doc(db, PLACES, placeId));
}

export function listPlacesByLocation(locationId) {
  const uid = requireUid();
  return getDocs(
    query(
      collection(db, PLACES),
      where("ownerId", "==", uid),
      where("locationId", "==", locationId),
      orderBy("name")
    )
  );
}

export function createPlace({ locationId, name }) {
  return addDoc(collection(db, PLACES), {
    ownerId: requireUid(),
    locationId,
    name,
    createdAt: serverTimestamp(),
  });
}

// ---- Items (the contents of a Place) ----
// `photos` is a gallery: an array of { url, path } objects.
export function listItemsByPlace(placeId) {
  const uid = requireUid();
  return getDocs(
    query(
      collection(db, ITEMS),
      where("ownerId", "==", uid),
      where("placeId", "==", placeId),
      orderBy("createdAt", "desc")
    )
  );
}

export function createItem({ placeId, name, photos = [] }) {
  return addDoc(collection(db, ITEMS), {
    ownerId: requireUid(),
    placeId,
    name,
    photos,
    createdAt: serverTimestamp(),
  });
}

export function updateItem(itemId, data) {
  return updateDoc(doc(db, ITEMS, itemId), data);
}

// ---- Reminders (attached to an Item or Place) ----
export function listOpenReminders() {
  const uid = requireUid();
  return getDocs(
    query(
      collection(db, REMINDERS),
      where("ownerId", "==", uid),
      where("done", "==", false),
      orderBy("dueAt")
    )
  );
}

export function createReminder({ targetType, targetId, title, dueAt }) {
  return addDoc(collection(db, REMINDERS), {
    ownerId: requireUid(),
    targetType,
    targetId,
    title,
    dueAt,
    done: false,
    createdAt: serverTimestamp(),
  });
}

export function updateReminder(reminderId, data) {
  return updateDoc(doc(db, REMINDERS, reminderId), data);
}

export function deleteReminder(reminderId) {
  return deleteDoc(doc(db, REMINDERS, reminderId));
}

// Delete all reminders targeting a given item or place.
async function deleteRemindersFor(targetId) {
  const uid = requireUid();
  const snap = await getDocs(
    query(
      collection(db, REMINDERS),
      where("ownerId", "==", uid),
      where("targetId", "==", targetId)
    )
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

// ---- Cascade deletes ----
// Delete an Item: its photos (Storage) + reminders, then the Item itself.
export async function deleteItemCascade(itemId) {
  const snap = await getDoc(doc(db, ITEMS, itemId));
  const photos = snap.exists() ? snap.data().photos ?? [] : [];
  await Promise.all(photos.map((p) => deletePhoto(p.path).catch(() => {})));
  await deleteRemindersFor(itemId);
  await deleteDoc(doc(db, ITEMS, itemId));
}

// Delete a Place: all its items (cascaded), reminders targeting the place,
// then the Place itself.
export async function deletePlaceCascade(placeId) {
  const items = await listItemsByPlace(placeId);
  await Promise.all(items.docs.map((d) => deleteItemCascade(d.id)));
  await deleteRemindersFor(placeId);
  await deleteDoc(doc(db, PLACES, placeId));
}
