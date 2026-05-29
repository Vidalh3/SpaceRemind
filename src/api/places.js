// Firestore data-access helpers for Locations, Places, and Items.
// See schema.md for the full data model. These are thin wrappers around the
// Firestore SDK so UI code never touches collection paths directly.
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
import { db } from "./firebase.js";

const LOCATIONS = "locations";
const PLACES = "places";
const ITEMS = "items";

// ---- Locations (e.g. "Kitchen") ----
export function listLocations() {
  return getDocs(query(collection(db, LOCATIONS), orderBy("name")));
}

export function createLocation({ name }) {
  return addDoc(collection(db, LOCATIONS), {
    name,
    createdAt: serverTimestamp(),
  });
}

// ---- Places (e.g. "Under Sink Cabinet") ----
export function getPlace(placeId) {
  return getDoc(doc(db, PLACES, placeId));
}

export function listPlacesByLocation(locationId) {
  return getDocs(
    query(collection(db, PLACES), where("locationId", "==", locationId), orderBy("name"))
  );
}

export function createPlace({ locationId, name }) {
  return addDoc(collection(db, PLACES), {
    locationId,
    name,
    createdAt: serverTimestamp(),
  });
}

export function deletePlace(placeId) {
  return deleteDoc(doc(db, PLACES, placeId));
}

// ---- Items (the contents of a Place) ----
export function listItemsByPlace(placeId) {
  return getDocs(
    query(collection(db, ITEMS), where("placeId", "==", placeId), orderBy("createdAt", "desc"))
  );
}

export function createItem({ placeId, name, photoUrl = null }) {
  return addDoc(collection(db, ITEMS), {
    placeId,
    name,
    photoUrl,
    createdAt: serverTimestamp(),
  });
}

export function updateItem(itemId, data) {
  return updateDoc(doc(db, ITEMS, itemId), data);
}

export function deleteItem(itemId) {
  return deleteDoc(doc(db, ITEMS, itemId));
}
