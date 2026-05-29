// Scan view — uses the device camera (html5-qrcode) to read a Place's QR
// code, and optionally listens for NFC taps. On a successful read it routes
// to that Place's inventory.
import { startScanner } from "../utils/qrcode.js";
import { isNfcSupported, readPlaceTag } from "../utils/nfc.js";
import { navigate } from "../router.js";
import { el, toast } from "../components/ui.js";

export async function renderScan() {
  const readerId = "qr-reader";
  const reader = el("div", { id: readerId, class: "overflow-hidden rounded-xl" });
  let stop = null;
  let nfcController = null;
  let handled = false;

  const goToPlace = (placeId) => {
    if (handled || !placeId) return;
    handled = true;
    stop?.().catch(() => {});
    nfcController?.abort();
    navigate(`#/place/${placeId}`);
  };

  // Tear down the camera/NFC when leaving this view.
  const cleanup = () => {
    stop?.().catch(() => {});
    nfcController?.abort();
    window.removeEventListener("hashchange", cleanup);
  };
  window.addEventListener("hashchange", cleanup);

  // Defer camera start until the node is in the DOM.
  setTimeout(async () => {
    try {
      stop = await startScanner(readerId, goToPlace);
    } catch (err) {
      reader.replaceChildren(
        el("p", { class: "py-8 text-center text-sm text-rose-400" },
          err.message || "Could not access the camera.")
      );
    }
  }, 0);

  if (isNfcSupported()) {
    readPlaceTag(goToPlace)
      .then((c) => {
        nfcController = c;
      })
      .catch(() => {});
  }

  return el("section", { class: "flex flex-col gap-4 px-4 py-4" }, [
    el("div", {}, [
      el("h2", { class: "text-lg font-semibold" }, "Scan a tag"),
      el("p", { class: "text-sm text-slate-400" },
        isNfcSupported()
          ? "Point the camera at a QR code, or tap an NFC tag."
          : "Point the camera at a Place's QR code."),
    ]),
    reader,
  ]);
}
