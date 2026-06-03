// Place view — the inventory of a single Place. This is what a scanned QR
// code or tapped NFC tag opens. Supports cataloging items (with photo
// galleries), generating the Place's QR code, writing an NFC tag, attaching
// reminders, and cascade-deleting items or the whole Place.
import {
  getPlace,
  listItemsByPlace,
  createItem,
  deleteItemCascade,
  deletePlaceCascade,
  createReminder,
} from "../api/places.js";
import { uploadItemPhoto } from "../api/storage.js";
import { currentUid } from "../api/firebase.js";
import { generateQrDataUrl, buildPlaceUrl } from "../utils/qrcode.js";
import { isNfcSupported, writePlaceTag } from "../utils/nfc.js";
import { navigate } from "../router.js";
import {
  el,
  emptyState,
  primaryButton,
  toast,
  modal,
  confirmDialog,
} from "../components/ui.js";

// --- Item photo gallery (horizontal thumbnails; tap to view full size) ---
function gallery(photos) {
  if (!photos?.length) return null;
  const strip = el("div", { class: "mt-2 flex gap-2 overflow-x-auto" });
  photos.forEach((p) => {
    strip.append(
      el("img", {
        src: p.url,
        alt: "",
        class: "h-16 w-16 flex-shrink-0 cursor-pointer rounded-lg object-cover",
        onClick: () =>
          modal(el("img", { src: p.url, alt: "", class: "max-h-[70vh] w-full rounded-lg object-contain" })),
      })
    );
  });
  return strip;
}

// --- Reminder dialog for an item or the place ---
function openReminderDialog(targetType, targetId, label) {
  const title = el("input", {
    type: "text",
    placeholder: `Remind me about ${label}…`,
    class: "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm",
  });
  const due = el("input", {
    type: "datetime-local",
    class: "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm",
  });
  let close;
  const save = primaryButton("Set reminder", async () => {
    if (!title.value.trim() || !due.value) return toast("Add a title and time.", "error");
    try {
      await createReminder({
        targetType,
        targetId,
        title: title.value.trim(),
        dueAt: new Date(due.value),
      });
      close();
      toast("Reminder set", "success");
    } catch (err) {
      toast(err.message || "Could not set reminder.", "error");
    }
  });
  close = modal(
    el("div", { class: "flex flex-col gap-3" }, [
      el("h3", { class: "font-semibold" }, "New reminder"),
      title,
      due,
      el("div", { class: "flex justify-end" }, [save]),
    ])
  );
}

// --- A single item row ---
function itemRow(doc, onChanged) {
  const item = doc.data();
  return el("div", { class: "rounded-xl border border-slate-800 bg-slate-900 p-3" }, [
    el("div", { class: "flex items-start justify-between gap-2" }, [
      el("p", { class: "font-medium" }, item.name),
      el("div", { class: "flex gap-1" }, [
        el(
          "button",
          {
            class: "rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200",
            title: "Add reminder",
            onClick: () => openReminderDialog("item", doc.id, item.name),
          },
          [el("svg", { class: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", html: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>' })]
        ),
        el(
          "button",
          {
            class: "rounded-md p-1.5 text-rose-400 transition-colors hover:bg-slate-800",
            title: "Delete item",
            onClick: async () => {
              if (await confirmDialog(`Delete "${item.name}" and its photos?`)) {
                await deleteItemCascade(doc.id);
                toast("Item deleted", "success");
                onChanged();
              }
            },
          },
          [el("svg", { class: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", html: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>' })]
        ),
      ]),
    ]),
    gallery(item.photos),
  ]);
}

// --- Add-item form with multi-photo upload ---
function addItemForm(placeId, onAdded) {
  const name = el("input", {
    type: "text",
    placeholder: "Item name (e.g. Dish soap)",
    class: "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm",
  });
  const files = el("input", {
    type: "file",
    accept: "image/*",
    multiple: true,
    class: "w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-slate-200",
  });
  const save = primaryButton("Add item", async () => {
    if (!name.value.trim()) return toast("Give the item a name.", "error");
    save.disabled = true;
    save.textContent = "Saving…";
    try {
      const photos = [];
      for (const file of files.files) {
        photos.push(await uploadItemPhoto(placeId, file));
      }
      await createItem({ placeId, name: name.value.trim(), photos });
      toast("Item added", "success");
      onAdded();
    } catch (err) {
      toast(err.message || "Could not save item.", "error");
      save.disabled = false;
      save.textContent = "Add item";
    }
  });
  return el("div", { class: "flex flex-col gap-2 rounded-xl border border-dashed border-slate-700 p-3" }, [
    name,
    files,
    el("div", { class: "flex justify-end" }, [save]),
  ]);
}

// --- QR + NFC actions ---
async function showQr(placeId, placeName) {
  const dataUrl = await generateQrDataUrl(placeId);
  const img = el("img", { src: dataUrl, alt: "QR code", class: "mx-auto rounded-lg bg-white p-2" });
  const actions = el("div", { class: "mt-4 flex justify-center gap-2" }, [
    el(
      "a",
      {
        href: dataUrl,
        download: `spaceremind-${placeName.replace(/\s+/g, "-").toLowerCase()}.png`,
        class: "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark",
      },
      "Download"
    ),
    el(
      "button",
      {
        class: "rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700",
        onClick: () => printQr(dataUrl, placeName),
      },
      "Print"
    ),
  ]);
  modal(
    el("div", { class: "flex flex-col gap-2 text-center" }, [
      el("h3", { class: "font-semibold" }, placeName),
      img,
      el("p", { class: "break-all text-xs text-slate-500" }, buildPlaceUrl(placeId)),
      actions,
    ])
  );
}

function printQr(dataUrl, placeName) {
  const w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print.", "error");
  w.document.write(
    `<title>${placeName}</title><div style="text-align:center;font-family:sans-serif;padding:40px">
      <h2>${placeName}</h2><img src="${dataUrl}" style="width:320px"/></div>`
  );
  w.document.close();
  w.focus();
  w.print();
}

async function writeNfc(placeId) {
  try {
    toast("Tap an NFC tag to write…");
    await writePlaceTag(placeId);
    toast("Tag written", "success");
  } catch (err) {
    toast(err.message || "NFC write failed.", "error");
  }
}

export async function renderPlace(placeId) {
  const snap = await getPlace(placeId);
  if (!snap.exists() || snap.data().ownerId !== currentUid()) {
    return emptyState("This place doesn't exist or isn't yours.");
  }
  const place = snap.data();

  const itemsWrap = el("div", { class: "flex flex-col gap-2" });
  const reload = async () => {
    const items = await listItemsByPlace(placeId);
    if (items.empty) {
      itemsWrap.replaceChildren(emptyState("No items catalogued yet."));
    } else {
      itemsWrap.replaceChildren(...items.docs.map((d) => itemRow(d, reload)));
    }
  };
  await reload();

  const actions = el("div", { class: "flex flex-wrap gap-2" }, [
    primaryButton("Show QR code", () => showQr(placeId, place.name)),
    isNfcSupported()
      ? el(
          "button",
          {
            class: "rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700",
            onClick: () => writeNfc(placeId),
          },
          "Write NFC tag"
        )
      : null,
    el(
      "button",
      {
        class: "rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700",
        onClick: () => openReminderDialog("place", placeId, place.name),
      },
      "Add reminder"
    ),
  ]);

  return el("section", { class: "flex flex-col gap-5 px-4 py-4" }, [
    el("div", { class: "flex items-start justify-between gap-2" }, [
      el("div", {}, [
        el("a", { href: "#/", class: "flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300" }, [
          el("svg", { class: "h-3.5 w-3.5", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round", html: '<path d="m15 18-6-6 6-6"/>' }),
          "All places",
        ]),
        el("h2", { class: "text-xl font-bold" }, place.name),
      ]),
      el(
        "button",
        {
          class: "rounded-md px-2 py-1 text-xs text-rose-400 hover:bg-slate-800",
          onClick: async () => {
            if (await confirmDialog(`Delete "${place.name}" and everything in it?`)) {
              await deletePlaceCascade(placeId);
              toast("Place deleted", "success");
              navigate("#/");
            }
          },
        },
        "Delete place"
      ),
    ]),
    actions,
    el("div", {}, [el("h3", { class: "mb-2 text-sm font-semibold text-slate-300" }, "Inventory"), itemsWrap]),
    addItemForm(placeId, reload),
  ]);
}
