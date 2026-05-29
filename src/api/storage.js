// Firebase Storage helpers for item photos.
// Photos are stored under places/<placeId>/<filename> and the resulting
// download URL is saved on the Item document (see schema.md).
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase.js";

export async function uploadItemPhoto(placeId, file) {
  const safeName = `${Date.now()}-${file.name}`.replace(/\s+/g, "_");
  const path = `places/${placeId}/${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return { url, path };
}

export function deletePhoto(path) {
  return deleteObject(ref(storage, path));
}
