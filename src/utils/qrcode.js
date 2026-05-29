// QR code utilities for SpaceRemind.
//
// Generation: every Place gets a deep link of the form
//   https://<host>/?place=<placeId>
// which is encoded into a QR code the user prints and sticks on the cabinet.
//
// Scanning: uses html5-qrcode to read a code with the device camera and
// extract the placeId so we can open that Place's inventory.
import { Html5Qrcode } from "html5-qrcode";

// Build the retrieval URL that gets encoded into the QR / written to NFC.
export function buildPlaceUrl(placeId, origin = window.location.origin) {
  return `${origin}/?place=${encodeURIComponent(placeId)}`;
}

// Pull a placeId back out of a scanned URL (or accept a raw id).
export function parsePlaceId(scannedText) {
  try {
    const url = new URL(scannedText);
    return url.searchParams.get("place");
  } catch {
    return scannedText || null;
  }
}

// Start the camera scanner inside `elementId`. Calls onScan(placeId) on the
// first successful decode and resolves with a stop() function.
export async function startScanner(elementId, onScan) {
  const scanner = new Html5Qrcode(elementId);
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };
  await scanner.start(
    { facingMode: "environment" },
    config,
    (decodedText) => onScan(parsePlaceId(decodedText), decodedText),
    () => {} // ignore per-frame decode errors
  );
  return async () => {
    await scanner.stop();
    scanner.clear();
  };
}
