// Web NFC helpers for SpaceRemind (Chrome on Android only).
// Used to write a Place's retrieval URL to an NFC tag and to read it back
// when the user taps a tag. Feature-detect before calling.
import { buildPlaceUrl, parsePlaceId } from "./qrcode.js";

export function isNfcSupported() {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

// Write the Place deep link to a physical tag.
export async function writePlaceTag(placeId) {
  if (!isNfcSupported()) throw new Error("Web NFC is not supported on this device.");
  const ndef = new NDEFReader();
  await ndef.write({ records: [{ recordType: "url", data: buildPlaceUrl(placeId) }] });
}

// Listen for tag taps. Calls onRead(placeId) for each scanned tag and
// resolves with an AbortController so the caller can stop scanning.
export async function readPlaceTag(onRead) {
  if (!isNfcSupported()) throw new Error("Web NFC is not supported on this device.");
  const ndef = new NDEFReader();
  const controller = new AbortController();
  await ndef.scan({ signal: controller.signal });
  ndef.addEventListener("reading", ({ message }) => {
    for (const record of message.records) {
      if (record.recordType === "url") {
        const text = new TextDecoder().decode(record.data);
        onRead(parsePlaceId(text), text);
      }
    }
  });
  return controller;
}
