// Firestore data-access helpers for Locations, Places, Items, and Reminders.
// Upgraded to support shared spaceId scoping, audit logging, and renaming.
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
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth, currentUid } from "./firebase.js";
import { deletePhoto } from "./storage.js";
import { getActiveSpaceId } from "./spaces.js";

const LOCATIONS = "locations";
const PLACES = "places";
const ITEMS = "items";
const REMINDERS = "reminders";
const ACTIVITY = "activity";

function requireUid() {
  const uid = currentUid();
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

// ---- Audit Activity Logs ----
export async function logActivity(text) {
  const uid = currentUid();
  if (!uid) return;
  const spaceId = getActiveSpaceId();
  try {
    await addDoc(collection(db, ACTIVITY), {
      ownerId: uid,
      spaceId,
      text,
      userName: auth.currentUser?.displayName || auth.currentUser?.email || "Someone",
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to write audit activity log:", err);
  }
}

export function listActivity() {
  const spaceId = getActiveSpaceId();
  return getDocs(
    query(
      collection(db, ACTIVITY),
      where("spaceId", "==", spaceId),
      orderBy("createdAt", "desc"),
      limit(20)
    )
  );
}

// ---- Locations (e.g. "Kitchen") ----
export function getLocation(locationId) {
  return getDoc(doc(db, LOCATIONS, locationId));
}

export async function listLocations() {
  const uid = requireUid();
  const spaceId = getActiveSpaceId();

  // Query records matching the active spaceId
  const q1 = query(collection(db, LOCATIONS), where("spaceId", "==", spaceId), orderBy("name"));
  const snap1 = await getDocs(q1);

  // For private space, fetch legacy records that don't have a spaceId
  if (spaceId === `private_${uid}`) {
    const q2 = query(collection(db, LOCATIONS), where("ownerId", "==", uid), where("spaceId", "==", null));
    const snap2 = await getDocs(q2);

    const seen = new Set();
    const docs = [];
    snap1.forEach((d) => {
      seen.add(d.id);
      docs.push(d);
    });
    snap2.forEach((d) => {
      if (!seen.has(d.id) && !d.data().spaceId) {
        docs.push(d);
      }
    });
    docs.sort((a, b) => a.data().name.localeCompare(b.data().name));
    return { empty: docs.length === 0, docs, forEach: (cb) => docs.forEach(cb) };
  }

  return snap1;
}

export async function createLocation({ name, icon = "📦" }) {
  const docRef = await addDoc(collection(db, LOCATIONS), {
    ownerId: requireUid(),
    spaceId: getActiveSpaceId(),
    name,
    icon,
    createdAt: serverTimestamp(),
  });
  await logActivity(`Created location "${name}"`);
  return docRef;
}

export async function updateLocation(locationId, data) {
  const ref = doc(db, LOCATIONS, locationId);
  const snap = await getDoc(ref);
  const oldName = snap.exists() ? snap.data().name : "";
  await updateDoc(ref, data);
  if (data.name && data.name !== oldName) {
    await logActivity(`Renamed location "${oldName}" to "${data.name}"`);
  } else if (data.icon) {
    await logActivity(`Changed icon of location "${data.name || oldName}" to ${data.icon}`);
  }
}

// ---- Places (e.g. "Under Sink Cabinet") ----
export function getPlace(placeId) {
  return getDoc(doc(db, PLACES, placeId));
}

export async function listPlacesByLocation(locationId) {
  const uid = requireUid();
  const spaceId = getActiveSpaceId();

  const q1 = query(
    collection(db, PLACES),
    where("spaceId", "==", spaceId),
    where("locationId", "==", locationId),
    orderBy("name")
  );
  const snap1 = await getDocs(q1);

  if (spaceId === `private_${uid}`) {
    const q2 = query(
      collection(db, PLACES),
      where("ownerId", "==", uid),
      where("locationId", "==", locationId),
      where("spaceId", "==", null)
    );
    const snap2 = await getDocs(q2);

    const seen = new Set();
    const docs = [];
    snap1.forEach((d) => {
      seen.add(d.id);
      docs.push(d);
    });
    snap2.forEach((d) => {
      if (!seen.has(d.id) && !d.data().spaceId) {
        docs.push(d);
      }
    });
    docs.sort((a, b) => a.data().name.localeCompare(b.data().name));
    return { empty: docs.length === 0, docs, forEach: (cb) => docs.forEach(cb) };
  }

  return snap1;
}

export async function createPlace({ locationId, name }) {
  const docRef = await addDoc(collection(db, PLACES), {
    ownerId: requireUid(),
    spaceId: getActiveSpaceId(),
    locationId,
    name,
    createdAt: serverTimestamp(),
  });
  await logActivity(`Created place "${name}"`);
  return docRef;
}

export async function updatePlace(placeId, data) {
  const ref = doc(db, PLACES, placeId);
  const snap = await getDoc(ref);
  const oldName = snap.exists() ? snap.data().name : "";
  await updateDoc(ref, data);
  if (data.name && data.name !== oldName) {
    await logActivity(`Renamed place "${oldName}" to "${data.name}"`);
  }
}

// ---- Items (the contents of a Place) ----
export function listItemsByPlace(placeId) {
  return getDocs(
    query(
      collection(db, ITEMS),
      where("placeId", "==", placeId),
      orderBy("createdAt", "desc")
    )
  );
}

// Fetch all items for searching
export async function listAllItems() {
  const uid = requireUid();
  const spaceId = getActiveSpaceId();

  const q1 = query(collection(db, ITEMS), where("spaceId", "==", spaceId));
  const snap1 = await getDocs(q1);

  if (spaceId === `private_${uid}`) {
    const q2 = query(collection(db, ITEMS), where("ownerId", "==", uid), where("spaceId", "==", null));
    const snap2 = await getDocs(q2);

    const seen = new Set();
    const docs = [];
    snap1.forEach((d) => {
      seen.add(d.id);
      docs.push(d);
    });
    snap2.forEach((d) => {
      if (!seen.has(d.id) && !d.data().spaceId) {
        docs.push(d);
      }
    });
    return { empty: docs.length === 0, docs };
  }

  return snap1;
}

export async function createItem({ placeId, name, photos = [], quantity = "", notes = "" }) {
  const docRef = await addDoc(collection(db, ITEMS), {
    ownerId: requireUid(),
    spaceId: getActiveSpaceId(),
    placeId,
    name,
    photos,
    quantity,
    notes,
    createdAt: serverTimestamp(),
  });
  await logActivity(`Added item "${name}"`);
  return docRef;
}

export async function updateItem(itemId, data) {
  const ref = doc(db, ITEMS, itemId);
  const snap = await getDoc(ref);
  const oldName = snap.exists() ? snap.data().name : "";
  await updateDoc(ref, data);
  if (data.name && data.name !== oldName) {
    await logActivity(`Renamed item "${oldName}" to "${data.name}"`);
  } else {
    await logActivity(`Updated details of item "${data.name || oldName}"`);
  }
}

// ---- Reminders (attached to an Item or Place) ----
export async function listOpenReminders() {
  const uid = requireUid();
  const spaceId = getActiveSpaceId();

  const q1 = query(
    collection(db, REMINDERS),
    where("spaceId", "==", spaceId),
    where("done", "==", false),
    orderBy("dueAt")
  );
  const snap1 = await getDocs(q1);

  if (spaceId === `private_${uid}`) {
    const q2 = query(
      collection(db, REMINDERS),
      where("ownerId", "==", uid),
      where("done", "==", false),
      where("spaceId", "==", null)
    );
    const snap2 = await getDocs(q2);

    const seen = new Set();
    const docs = [];
    snap1.forEach((d) => {
      seen.add(d.id);
      docs.push(d);
    });
    snap2.forEach((d) => {
      if (!seen.has(d.id) && !d.data().spaceId) {
        docs.push(d);
      }
    });
    docs.sort((a, b) => {
      const da = a.data().dueAt?.toDate ? a.data().dueAt.toDate() : a.data().dueAt;
      const db = b.data().dueAt?.toDate ? b.data().dueAt.toDate() : b.data().dueAt;
      return da - db;
    });
    return { empty: docs.length === 0, docs, forEach: (cb) => docs.forEach(cb) };
  }

  return snap1;
}

export async function createReminder({ targetType, targetId, title, dueAt }) {
  const docRef = await addDoc(collection(db, REMINDERS), {
    ownerId: requireUid(),
    spaceId: getActiveSpaceId(),
    targetType,
    targetId,
    title,
    dueAt,
    done: false,
    createdAt: serverTimestamp(),
  });
  await logActivity(`Set reminder: "${title}"`);
  return docRef;
}

export async function updateReminder(reminderId, data) {
  const ref = doc(db, REMINDERS, reminderId);
  const snap = await getDoc(ref);
  const r = snap.exists() ? snap.data() : null;
  await updateDoc(ref, data);
  if (data.done === true && r) {
    await logActivity(`Completed reminder: "${r.title}"`);
  }
}

export async function deleteReminder(reminderId) {
  const snap = await getDoc(doc(db, REMINDERS, reminderId));
  const title = snap.exists() ? snap.data().title : "";
  await deleteDoc(doc(db, REMINDERS, reminderId));
  if (title) {
    await logActivity(`Deleted reminder: "${title}"`);
  }
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
export async function deleteItemCascade(itemId) {
  const snap = await getDoc(doc(db, ITEMS, itemId));
  if (!snap.exists()) return;
  const item = snap.data();
  const photos = item.photos ?? [];
  await Promise.all(photos.map((p) => deletePhoto(p.path).catch(() => {})));
  await deleteRemindersFor(itemId);
  await deleteDoc(doc(db, ITEMS, itemId));
  await logActivity(`Deleted item "${item.name}"`);
}

export async function deletePlaceCascade(placeId) {
  const snap = await getDoc(doc(db, PLACES, placeId));
  if (!snap.exists()) return;
  const place = snap.data();
  const items = await listItemsByPlace(placeId);
  await Promise.all(items.docs.map((d) => deleteItemCascade(d.id)));
  await deleteRemindersFor(placeId);
  await deleteDoc(doc(db, PLACES, placeId));
  await logActivity(`Deleted place "${place.name}"`);
}
