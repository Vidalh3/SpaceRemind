// Scan view — Material 3 redesign. Viewfinder overlay for QR scanning,
// dynamic NFC listening, and active status badges.
import { startScanner } from "../utils/qrcode.js";
import { isNfcSupported, readPlaceTag } from "../utils/nfc.js";
import { navigate } from "../router.js";
import { el, toast } from "../components/ui.js";

export async function renderScan() {
  const readerId = "qr-reader";
  const reader = el("div", { 
    id: readerId, 
    class: "overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 aspect-square shadow-inner flex items-center justify-center relative" 
  });
  
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

  // Tear down the camera/NFC scan when leaving this view.
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
        el("div", { class: "p-8 text-center text-sm text-rose-450 font-semibold" },
          err.message || "Could not access the camera.")
      );
    }
  }, 0);

  let nfcBadge = null;
  if (isNfcSupported()) {
    // Render a nice active pulsing indicator badge for NFC
    nfcBadge = el("div", { 
      class: "flex items-center justify-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/40 px-4 py-2.5 text-xs font-bold text-emerald-350 shadow-sm transition w-full"
    }, [
      el("span", { class: "h-2 w-2 rounded-full bg-emerald-400 animate-ping" }),
      "NFC Scanning Active: Tap tag to read"
    ]);

    readPlaceTag(goToPlace)
      .then((c) => {
        nfcController = c;
      })
      .catch((err) => {
        console.error("NFC start scan failed:", err);
      });
  }

  return el("section", { class: "flex flex-col gap-5 px-4 py-4 min-h-[calc(100vh-160px)]" }, [
    el("div", {}, [
      el("h2", { class: "text-xl font-black text-slate-100 tracking-tight" }, "Scan a tag"),
      el("p", { class: "text-xs text-slate-400 mt-1 font-medium" },
        isNfcSupported()
          ? "Point the camera at a QR code, or tap an NFC tag."
          : "Point the camera at a Place's QR code."),
    ]),
    reader,
    nfcBadge,
  ]);
}
