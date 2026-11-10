// Place view — Material 3 place details.
// Lists place inventory, supports QR/NFC operations, editing place names, and detailed item editing.
import {
  getPlace,
  listItemsByPlace,
  createItem,
  deleteItemCascade,
  deletePlaceCascade,
  createReminder,
  updateItem,
  updatePlace,
  getLocation,
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
  const strip = el("div", { class: "mt-3 flex gap-2 overflow-x-auto pb-1" });
  photos.forEach((p) => {
    strip.append(
      el("img", {
        src: p.url,
        alt: "",
        class: "h-16 w-16 flex-shrink-0 cursor-pointer rounded-xl object-cover border border-slate-800/80 transition hover:border-slate-600",
        onClick: () =>
          modal(el("img", { src: p.url, alt: "", class: "max-h-[70vh] w-full rounded-2xl object-contain" })),
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
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none",
  });
  const due = el("input", {
    type: "datetime-local",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none",
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
    el("div", { class: "space-y-4" }, [
      el("div", {}, [
        el("h3", { class: "text-lg font-extrabold text-white" }, "Add Reminder"),
        el("p", { class: "text-xs text-slate-400 mt-1" }, `Create a reminder for "${label}"`),
      ]),
      title,
      due,
      el("div", { class: "flex justify-end gap-2.5 pt-2" }, [
        el(
          "button",
          {
            class: "rounded-full px-5 py-2 text-sm font-bold text-slate-450 hover:bg-slate-800 transition active:scale-95",
            onClick: () => close(),
          },
          "Cancel"
        ),
        save,
      ]),
    ])
  );
}

// --- A single item card ---
function itemRow(docRef, onChanged) {
  const item = docRef.data();
  const docId = docRef.id;

  const adjustQty = async (delta) => {
    let current = parseInt(item.quantity);
    if (isNaN(current)) current = 0;
    const next = Math.max(0, current + delta);
    try {
      await updateItem(docId, { quantity: String(next) });
      toast(`Quantity updated to ${next}`, "success");
      onChanged();
    } catch (err) {
      toast(err.message || "Could not update quantity.", "error");
    }
  };

  const qtyControls = item.quantity && !isNaN(parseInt(item.quantity))
    ? el("div", { class: "flex items-center gap-1.5 mt-2 bg-slate-850/60 rounded-full px-2.5 py-1 w-max border border-slate-800" }, [
        el("button", {
          class: "text-xs font-black text-slate-400 hover:text-white px-1 transition",
          onClick: () => adjustQty(-1)
        }, "−"),
        el("span", { class: "text-xs font-bold text-slate-300 px-1" }, `Qty: ${item.quantity}`),
        el("button", {
          class: "text-xs font-black text-slate-400 hover:text-white px-1 transition",
          onClick: () => adjustQty(1)
        }, "+"),
      ])
    : (item.quantity 
        ? el("span", { class: "inline-block text-xs font-bold bg-slate-850/80 text-slate-350 px-2.5 py-0.5 rounded-full border border-slate-800 mt-2" }, `Qty: ${item.quantity}`) 
        : null);

  const notesBlock = item.notes
    ? el("p", { class: "text-xs text-slate-400 mt-2 leading-relaxed bg-slate-850/30 p-2.5 rounded-xl border border-slate-800/80 italic font-medium" }, item.notes)
    : null;

  return el("div", { class: "rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm" }, [
    el("div", { class: "flex items-start justify-between gap-2" }, [
      el("p", { class: "font-bold text-slate-200 text-sm tracking-wide mt-0.5" }, item.name),
      el("div", { class: "flex gap-1" }, [
        el(
          "button",
          {
            class: "rounded-full bg-slate-800/80 hover:bg-slate-700 h-7 w-7 flex items-center justify-center text-xs transition active:scale-90",
            title: "Edit item details",
            onClick: () => openEditItemDialog(docId, item, onChanged),
          },
          "✏️"
        ),
        el(
          "button",
          {
            class: "rounded-full bg-slate-800/80 hover:bg-slate-700 h-7 w-7 flex items-center justify-center text-xs transition active:scale-90",
            title: "Add reminder",
            onClick: () => openReminderDialog("item", docId, item.name),
          },
          "⏰"
        ),
        el(
          "button",
          {
            class: "rounded-full bg-slate-800/80 hover:bg-rose-950/80 h-7 w-7 flex items-center justify-center text-xs text-rose-400 transition active:scale-90",
            title: "Delete item",
            onClick: async () => {
              if (await confirmDialog(`Delete "${item.name}" and its photos?`)) {
                await deleteItemCascade(docId);
                toast("Item deleted", "success");
                onChanged();
              }
            },
          },
          "🗑"
        ),
      ]),
    ]),
    qtyControls,
    notesBlock,
    gallery(item.photos),
  ]);
}

// --- Add-item dialog with multi-photo upload ---
function openAddItemDialog(placeId, onAdded) {
  const name = el("input", {
    type: "text",
    placeholder: "Item name (e.g. Dish soap)",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none",
  });

  const quantity = el("input", {
    type: "text",
    placeholder: "e.g. 3, Pack of 12",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none",
  });

  const notes = el("textarea", {
    placeholder: "e.g. Store in back shelf, expires 2027",
    rows: "3",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none resize-none",
  });
  
  const files = el("input", {
    type: "file",
    accept: "image/*",
    multiple: true,
    class: "w-full text-xs text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-slate-250 file:font-semibold hover:file:bg-slate-650 transition cursor-pointer",
  });

  let close;
  const save = primaryButton("Add Item", async () => {
    if (!name.value.trim()) return toast("Give the item a name.", "error");
    save.disabled = true;
    save.textContent = "Saving…";
    try {
      const photos = [];
      for (const file of files.files) {
        photos.push(await uploadItemPhoto(placeId, file));
      }
      await createItem({
        placeId,
        name: name.value.trim(),
        photos,
        quantity: quantity.value.trim(),
        notes: notes.value.trim()
      });
      toast("Item added", "success");
      close();
      onAdded();
    } catch (err) {
      toast(err.message || "Could not save item.", "error");
      save.disabled = false;
      save.textContent = "Add item";
    }
  });

  close = modal(
    el("div", { class: "space-y-4" }, [
      el("div", {}, [
        el("h3", { class: "text-lg font-extrabold text-white" }, "Add Inventory Item"),
        el("p", { class: "text-xs text-slate-400 mt-1" }, "Catalog a new item in this storage place"),
      ]),
      el("div", { class: "flex flex-col gap-1.5 text-left" }, [
        el("label", { class: "text-xs font-semibold text-slate-350" }, "Item Name"),
        name,
      ]),
      el("div", { class: "flex flex-col gap-1.5 text-left" }, [
        el("label", { class: "text-xs font-semibold text-slate-350" }, "Quantity (Optional)"),
        quantity,
      ]),
      el("div", { class: "flex flex-col gap-1.5 text-left" }, [
        el("label", { class: "text-xs font-semibold text-slate-350" }, "Notes / Expiration (Optional)"),
        notes,
      ]),
      el("div", { class: "flex flex-col gap-1.5 text-left" }, [
        el("label", { class: "text-xs font-semibold text-slate-350" }, "Photos (Optional)"),
        files,
      ]),
      el("div", { class: "flex justify-end gap-2.5 pt-2" }, [
        el(
          "button",
          {
            class: "rounded-full px-5 py-2 text-sm font-bold text-slate-450 hover:bg-slate-800 transition active:scale-95",
            onClick: () => close(),
          },
          "Cancel"
        ),
        save,
      ]),
    ])
  );
  setTimeout(() => name.focus(), 50);
}

// --- Edit Item Dialog (rename, notes, quantity, append photos) ---
function openEditItemDialog(itemId, item, onChanged) {
  const name = el("input", {
    type: "text",
    value: item.name || "",
    placeholder: "Item name",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none",
  });

  const quantity = el("input", {
    type: "text",
    value: item.quantity || "",
    placeholder: "e.g. 3, Pack of 12",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none",
  });

  const notes = el("textarea", {
    placeholder: "Notes or expiration",
    value: item.notes || "",
    rows: "3",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none resize-none",
  });
  
  const files = el("input", {
    type: "file",
    accept: "image/*",
    multiple: true,
    class: "w-full text-xs text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-slate-250 file:font-semibold hover:file:bg-slate-650 transition cursor-pointer",
  });

  let close;
  const save = primaryButton("Save Changes", async () => {
    if (!name.value.trim()) return toast("Give the item a name.", "error");
    save.disabled = true;
    save.textContent = "Saving…";
    try {
      const photos = [...(item.photos || [])];
      for (const file of files.files) {
        photos.push(await uploadItemPhoto(item.placeId, file));
      }
      await updateItem(itemId, {
        name: name.value.trim(),
        quantity: quantity.value.trim(),
        notes: notes.value.trim(),
        photos
      });
      toast("Item details updated", "success");
      close();
      onChanged();
    } catch (err) {
      toast(err.message || "Could not update item.", "error");
      save.disabled = false;
      save.textContent = "Save Changes";
    }
  });

  close = modal(
    el("div", { class: "space-y-4" }, [
      el("div", {}, [
        el("h3", { class: "text-lg font-extrabold text-white" }, "Edit Item Details"),
        el("p", { class: "text-xs text-slate-400 mt-1" }, "Modify catalog details or add extra photos"),
      ]),
      el("div", { class: "flex flex-col gap-1.5 text-left" }, [
        el("label", { class: "text-xs font-semibold text-slate-350" }, "Item Name"),
        name,
      ]),
      el("div", { class: "flex flex-col gap-1.5 text-left" }, [
        el("label", { class: "text-xs font-semibold text-slate-350" }, "Quantity"),
        quantity,
      ]),
      el("div", { class: "flex flex-col gap-1.5 text-left" }, [
        el("label", { class: "text-xs font-semibold text-slate-350" }, "Notes / Expiration"),
        notes,
      ]),
      el("div", { class: "flex flex-col gap-1.5 text-left" }, [
        el("label", { class: "text-xs font-semibold text-slate-350" }, "Add More Photos"),
        files,
      ]),
      el("div", { class: "flex justify-end gap-2.5 pt-2" }, [
        el(
          "button",
          {
            class: "rounded-full px-5 py-2 text-sm font-bold text-slate-450 hover:bg-slate-800 transition active:scale-95",
            onClick: () => close(),
          },
          "Cancel"
        ),
        save,
      ]),
    ])
  );
  setTimeout(() => name.focus(), 50);
}

// Modal dialog to rename Place
function openRenamePlaceDialog(placeId, oldName, onRenamed) {
  const input = el("input", {
    type: "text",
    value: oldName,
    placeholder: "Place name (e.g. Closet Shelf)",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none transition-colors",
  });

  let close;
  const save = primaryButton("Save", async () => {
    const name = input.value.trim();
    if (!name) return toast("Enter a place name.", "error");
    try {
      await updatePlace(placeId, { name });
      toast("Place renamed", "success");
      close();
      onRenamed();
    } catch (err) {
      toast(err.message || "Failed to rename.", "error");
    }
  });

  close = modal(
    el("div", { class: "space-y-4" }, [
      el("div", {}, [
        el("h3", { class: "text-lg font-extrabold text-white" }, "Rename Place"),
        el("p", { class: "text-xs text-slate-400 mt-1" }, "Rename this specific storage place"),
      ]),
      input,
      el("div", { class: "flex justify-end gap-2.5 pt-2" }, [
        el(
          "button",
          {
            class: "rounded-full px-5 py-2 text-sm font-bold text-slate-450 hover:bg-slate-800 transition active:scale-95",
            onClick: () => close(),
          },
          "Cancel"
        ),
        save,
      ]),
    ])
  );
  setTimeout(() => input.focus(), 50);
}

// --- QR + NFC actions ---
async function showQr(placeId, placeName) {
  const dataUrl = await generateQrDataUrl(placeId);
  const img = el("img", { src: dataUrl, alt: "QR code", class: "mx-auto rounded-2xl bg-white p-3 shadow-md" });
  const actions = el("div", { class: "mt-5 flex justify-center gap-2.5" }, [
    el(
      "a",
      {
        href: dataUrl,
        download: `spaceremind-${placeName.replace(/\s+/g, "-").toLowerCase()}.png`,
        class: "rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow hover:bg-brand-dark transition",
      },
      "Download"
    ),
    el(
      "button",
      {
        class: "rounded-full border border-slate-700 px-5 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 transition active:scale-95",
        onClick: () => printQr(dataUrl, placeName),
      },
      "Print"
    ),
  ]);
  modal(
    el("div", { class: "flex flex-col gap-3 text-center" }, [
      el("div", {}, [
        el("h3", { class: "text-lg font-bold text-white" }, placeName),
        el("p", { class: "text-xs text-slate-500 mt-1" }, "Inventory QR Code"),
      ]),
      img,
      el("p", { class: "break-all text-[10px] text-slate-500 font-mono" }, buildPlaceUrl(placeId)),
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
  let closePrompt;
  let isCancelled = false;
  
  closePrompt = modal(
    el("div", { class: "space-y-4 text-center py-4" }, [
      el("div", { class: "text-4.5xl animate-bounce" }, "⚡"),
      el("h3", { class: "text-lg font-extrabold text-white" }, "Write NFC Tag"),
      el("p", { class: "text-xs text-slate-400 px-2" }, "Hold the back of your phone against the NFC tag to write the place link."),
      el("button", {
        class: "rounded-full border border-slate-700 px-5 py-2 text-xs font-bold text-slate-350 hover:bg-slate-800 transition active:scale-95 mt-2",
        onClick: () => {
          isCancelled = true;
          closePrompt();
          toast("Write cancelled", "info");
        }
      }, "Cancel")
    ]),
    {
      onClose: () => {
        isCancelled = true;
      }
    }
  );

  try {
    await writePlaceTag(placeId);
    if (!isCancelled) {
      closePrompt();
      toast("Tag written successfully!", "success");
    }
  } catch (err) {
    if (!isCancelled) {
      closePrompt();
      toast(err.message || "NFC write failed.", "error");
    }
  }
}

export async function renderPlace(placeId) {
  const snap = await getPlace(placeId);
  if (!snap.exists()) {
    return emptyState("This place doesn't exist.");
  }
  const place = snap.data();

  const itemsWrap = el("div", { class: "flex flex-col gap-3" });
  const reload = async () => {
    const items = await listItemsByPlace(placeId);
    if (items.empty) {
      itemsWrap.replaceChildren(emptyState("No items catalogued yet. Tap the '+' button below to add one."));
    } else {
      itemsWrap.replaceChildren(...items.docs.map((d) => itemRow(d, reload)));
    }
  };
  await reload();

  // Material 3 action buttons
  const actions = el("div", { class: "flex flex-wrap gap-2 py-1" }, [
    el(
      "button",
      {
        class: "rounded-full border border-slate-700/80 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800 hover:text-slate-100 active:scale-95 flex items-center gap-1.5 shadow-sm bg-slate-900/35",
        onClick: () => showQr(placeId, place.name),
      },
      ["📊", "Show QR code"]
    ),
    isNfcSupported()
      ? el(
          "button",
          {
            class: "rounded-full border border-slate-700/80 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800 hover:text-slate-100 active:scale-95 flex items-center gap-1.5 shadow-sm bg-slate-900/35",
            onClick: () => writeNfc(placeId),
          },
          ["⚡", "Write NFC tag"]
        )
      : null,
    el(
      "button",
      {
        class: "rounded-full border border-slate-700/80 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800 hover:text-slate-100 active:scale-95 flex items-center gap-1.5 shadow-sm bg-slate-900/35",
        onClick: () => openReminderDialog("place", placeId, place.name),
      },
      ["⏰", "Add reminder"]
    ),
  ]);

  // Floating Action Button (FAB) for adding new items
  const fab = el(
    "button",
    {
      class: "fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-200",
      title: "Add item",
      onClick: () => openAddItemDialog(placeId, reload),
    },
    [
      el("svg", {
        class: "h-6 w-6",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2.5",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        html: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
      }),
    ]
  );

  const placeTitle = el("h2", { class: "text-2xl font-black text-slate-100 tracking-tight" }, place.name);
  const locationBreadcrumb = el("span", { class: "text-slate-500" }, "Loading location...");

  // Resolve parent location path breadcrumb dynamically
  getLocation(place.locationId).then((locSnap) => {
    if (locSnap.exists()) {
      locationBreadcrumb.textContent = locSnap.data().name;
    }
  }).catch(() => {
    locationBreadcrumb.textContent = "General";
  });

  const renameBtn = el("button", {
    class: "ml-2 text-xs text-slate-400 hover:text-white transition font-medium",
    onClick: () => openRenamePlaceDialog(placeId, place.name, () => {
      window.location.reload();
    })
  }, "✏️ Rename");

  return el("section", { class: "flex flex-col gap-4 px-4 py-4 min-h-[calc(100vh-160px)] relative" }, [
    el("div", { class: "flex items-start justify-between gap-3" }, [
      el("div", {}, [
        el("a", { href: "#/", class: "text-xs font-bold text-slate-500 hover:text-brand transition flex items-center gap-0.5 mb-1" }, [
          "‹ ",
          locationBreadcrumb
        ]),
        el("div", { class: "flex items-baseline" }, [
          placeTitle,
          renameBtn
        ])
      ]),
      el(
        "button",
        {
          class: "rounded-full border border-rose-800/80 px-3.5 py-1.5 text-xs font-bold text-rose-450 hover:bg-rose-950/40 transition active:scale-95 shadow-sm",
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
    el("div", { class: "pt-1" }, [
      el("h3", { class: "mb-3 text-xs font-extrabold text-slate-400 tracking-wider uppercase" }, "Inventory"), 
      itemsWrap
    ]),
    fab,
  ]);
}
