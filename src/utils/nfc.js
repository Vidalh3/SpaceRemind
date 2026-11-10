// NFC helpers for SpaceRemind (supporting both Web NFC in Chrome and native Capacitor NFC plugin).
import { buildPlaceUrl, parsePlaceId } from "./qrcode.js";
import { Capacitor } from "@capacitor/core";
import { NFC } from "@exxili/capacitor-nfc";

export function isNfcSupported() {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  return "NDEFReader" in window;
}

// Write the Place deep link to a physical tag.
export async function writePlaceTag(placeId) {
  if (!isNfcSupported()) throw new Error("NFC is not supported on this device.");

  if (Capacitor.isNativePlatform()) {
    const { supported } = await NFC.isSupported();
    if (!supported) throw new Error("NFC is disabled or not supported on this device.");

    return new Promise(async (resolve, reject) => {
      let successListener = null;
      let errorListener = null;

      const cleanUp = () => {
        if (successListener) {
          successListener();
          successListener = null;
        }
        if (errorListener) {
          errorListener();
          errorListener = null;
        }
      };

      try {
        // Register native write listeners. In the Exxili plugin, these return
        // an unsubscribe callback function synchronously.
        successListener = NFC.onWrite(() => {
          cleanUp();
          resolve();
        });

        errorListener = NFC.onError((err) => {
          cleanUp();
          reject(new Error(err?.message || "NFC write failed"));
        });

        // Trigger native write command (Android queues this request and resolves
        // immediately; the actual write will occur when the tag is tapped, firing onWrite).
        await NFC.writeNDEF({
          records: [
            {
              type: "U",
              payload: buildPlaceUrl(placeId),
            }
          ]
        });
      } catch (err) {
        cleanUp();
        reject(err);
      }
    });
  } else {
    // Web NFC fallback
    const ndef = new NDEFReader();
    await ndef.write({ records: [{ recordType: "url", data: buildPlaceUrl(placeId) }] });
  }
}

// Listen for tag taps. Calls onRead(placeId) for each scanned tag and
// resolves with an AbortController/abortable handle to stop scanning.
export async function readPlaceTag(onRead) {
  if (!isNfcSupported()) throw new Error("NFC is not supported on this device.");

  if (Capacitor.isNativePlatform()) {
    const { supported } = await NFC.isSupported();
    if (!supported) throw new Error("NFC is disabled or not supported on this device.");

    // Register reader callback listener first to capture immediate taps.
    // Returns an unsubscribe callback function synchronously.
    const listener = NFC.onRead((data) => {
      try {
        console.log("NFC Tag raw read:", data);
        const asString = data.string();
        console.log("NFC Tag string read:", asString);
        const firstMessage = asString.messages[0];
        const firstRecord = firstMessage?.records[0];
        if (firstRecord && firstRecord.payload) {
          let text = firstRecord.payload;
          // Clean up any NDEF URI prefix bytes if present:
          if (text.charCodeAt(0) < 32) {
            const prefixByte = text.charCodeAt(0);
            const prefixes = [
              "", "http://www.", "https://www.", "http://", "https://", "tel:", "mailto:",
              "ftp://anonymous:anonymous@", "ftp://ftp.", "ftps://", "sftp://", "smb://",
              "nfs://", "ftp://", "dav://", "news:", "telnet://", "imap:", "rtsp://",
              "urn:", "pop:", "sip:", "sips:", "tftp:", "btspp://", "btl2cap://",
              "btgoep://", "tcpobex://", "irdaobex://", "file://", "urn:epc:id:",
              "urn:epc:tag:", "urn:epc:pat:", "urn:epc:raw:", "urn:epc:", "urn:nfc:"
            ];
            if (prefixByte < prefixes.length) {
              text = prefixes[prefixByte] + text.slice(1);
            } else {
              text = text.slice(1);
            }
          }
          console.log("NFC Tag parsed URL text:", text);
          const parsedId = parsePlaceId(text);
          console.log("NFC Tag parsed place ID:", parsedId);
          onRead(parsedId, text);
        }
      } catch (err) {
        console.error("NFC read parse error:", err);
      }
    });

    // Start native scanning engine
    await NFC.startScan();

    return {
      abort: () => {
        NFC.cancelScan().catch(() => {});
        if (listener) listener();
      }
    };
  } else {
    // Web NFC fallback
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
}
