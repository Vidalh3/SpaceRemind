// Home view — Material 3 dashboard.
// Includes search bar, preset location icons, rename options, and delete protection.
import {
  listLocations,
  listPlacesByLocation,
  createLocation,
  createPlace,
  updateLocation,
  listAllItems,
  logActivity,
} from "../api/places.js";
import { el, emptyState, primaryButton, toast, modal } from "../components/ui.js";
import { getArtwork } from "../utils/settings.js";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../api/firebase.js";

const LOCATION_PRESETS = [
  { icon: "📦", label: "General" },
  { icon: "🍳", label: "Kitchen" },
  { icon: "🛋", label: "Living" },
  { icon: "🚗", label: "Garage" },
  { icon: "🛏", label: "Bedroom" },
  { icon: "🛁", label: "Bathroom" },
  { icon: "👕", label: "Closet" },
  { icon: "📚", label: "Office" },
  { icon: "🧸", label: "Attic" }
];

// Inline form to add Places inside Location cards
function addForm(placeholder, label, onSubmit) {
  const input = el("input", {
    type: "text",
    placeholder,
    class: "flex-1 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none transition-colors focus:bg-slate-800",
  });
  const submit = async () => {
    const value = input.value.trim();
    if (!value) return;
    input.disabled = true;
    try {
      await onSubmit(value);
      input.value = "";
    } catch (err) {
      toast(err.message || "Could not save.", "error");
    } finally {
      input.disabled = false;
      input.focus();
    }
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  const btn = el(
    "button",
    {
      class: "rounded-full bg-slate-800 hover:bg-slate-750 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition active:scale-95",
      onClick: submit
    },
    label
  );
  return el("div", { class: "flex gap-2 items-center w-full mt-2" }, [input, btn]);
}

async function placesList(locationId) {
  const wrap = el("div", { class: "mt-1.5 flex flex-col gap-1.5 pl-2" });
  const snap = await listPlacesByLocation(locationId);
  
  if (snap.empty) {
    wrap.append(el("p", { class: "py-1 text-xs text-slate-500 font-medium italic pl-1" }, "No places yet."));
  } else {
    snap.forEach((doc) => {
      const place = doc.data();
      wrap.append(
        el(
          "a",
          {
            href: `#/place/${doc.id}`,
            class: "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-350 bg-slate-850/50 hover:bg-slate-800/70 border border-slate-800/60 transition",
          },
          [place.name, el("span", { class: "text-slate-500 text-lg leading-none" }, "›")]
        )
      );
    });
  }
  
  wrap.append(
    el("div", { class: "mt-1.5" }, [
      addForm("New place (e.g. Closet)", "Add", async (name) => {
        await createPlace({ locationId, name });
        const fresh = await placesList(locationId);
        wrap.replaceWith(fresh);
      }),
    ])
  );
  return wrap;
}

function locationCard(docRef, onReload) {
  const location = docRef.data();
  const body = el("div", { class: "hidden" });
  let loaded = false;
  
  const chevron = el("span", { class: "text-slate-500 text-lg transition-transform duration-200 leading-none" }, "⌄");
  const currentIcon = location.icon || "📦";
  const artworkMode = getArtwork();

  const iconCircle = el(
    "div",
    {
      class: `m3-location-icon flex h-8 w-8 items-center justify-center rounded-full text-base bg-brand/10 border border-brand/20 mr-3 shrink-0 ${
        artworkMode === "minimal" ? "hidden" : ""
      }`
    },
    currentIcon
  );

  const header = el(
    "button",
    {
      class: "flex flex-1 items-center px-4 py-3.5 text-left transition hover:bg-slate-800/40 outline-none",
      onClick: async () => {
        const isHidden = body.classList.toggle("hidden");
        if (isHidden) {
          chevron.style.transform = "rotate(0deg)";
        } else {
          chevron.style.transform = "rotate(180deg)";
          if (!loaded) {
            loaded = true;
            body.replaceChildren(await placesList(docRef.id));
          }
        }
      },
    },
    [
      iconCircle,
      el("span", { class: "font-bold text-slate-200 text-sm tracking-wide flex-1" }, location.name),
      chevron,
    ]
  );

  const editBtn = el("button", {
    class: "flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition active:scale-90 mr-2 shrink-0",
    title: "Edit Location",
    onClick: (e) => {
      e.stopPropagation();
      openEditLocationDialog(docRef.id, location.name, currentIcon, onReload);
    }
  }, [
    el("svg", {
      class: "h-4 w-4",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      html: '<path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'
    })
  ]);
  
  return el("div", { class: "overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md transition hover:border-slate-700/60 shadow-sm flex flex-col" }, [
    el("div", { class: "flex items-center w-full justify-between" }, [
      header,
      editBtn
    ]),
    el("div", { class: "px-4 pb-4" }, [body]),
  ]);
}

// Modal dialog to add a new location
function openAddLocationDialog(onAdded) {
  let selectedIcon = "📦";

  const input = el("input", {
    type: "text",
    placeholder: "Location name (e.g. Basement)",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none transition-colors",
  });

  const presetGrid = el("div", { class: "grid grid-cols-5 gap-2 pt-1" });
  LOCATION_PRESETS.forEach((p) => {
    const btn = el("button", {
      class: "flex h-11 flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-lg hover:border-brand/40 transition active:scale-95",
      title: p.label,
      onClick: () => {
        selectedIcon = p.icon;
        presetGrid.querySelectorAll("button").forEach((b) => b.classList.remove("border-brand", "bg-brand/10"));
        btn.classList.add("border-brand", "bg-brand/10");
      }
    }, p.icon);
    
    if (p.icon === "📦") btn.classList.add("border-brand", "bg-brand/10");
    presetGrid.append(btn);
  });
  
  let close;
  const save = primaryButton("Add Location", async () => {
    const name = input.value.trim();
    if (!name) return toast("Enter a location name.", "error");
    try {
      await createLocation({ name, icon: selectedIcon });
      toast("Location added", "success");
      close();
      onAdded();
    } catch (err) {
      toast(err.message || "Could not save.", "error");
    }
  });

  close = modal(
    el("div", { class: "space-y-4" }, [
      el("div", {}, [
        el("h3", { class: "text-lg font-extrabold text-white" }, "Add Location"),
        el("p", { class: "text-xs text-slate-400 mt-1" }, "Create a new high-level storage location"),
      ]),
      input,
      el("div", {}, [
        el("label", { class: "block text-xs text-slate-400 font-bold mb-2" }, "Select Preset Icon"),
        presetGrid
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
  setTimeout(() => input.focus(), 50);
}

// Modal dialog to edit location (Rename / Icon / Delete Protection)
function openEditLocationDialog(locationId, oldName, oldIcon, onReload) {
  let selectedIcon = oldIcon;

  const input = el("input", {
    type: "text",
    value: oldName,
    placeholder: "Location name",
    class: "w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none transition-colors",
  });

  const presetGrid = el("div", { class: "grid grid-cols-5 gap-2 pt-1" });
  LOCATION_PRESETS.forEach((p) => {
    const btn = el("button", {
      class: "flex h-11 flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-lg hover:border-brand/40 transition active:scale-95",
      onClick: () => {
        selectedIcon = p.icon;
        presetGrid.querySelectorAll("button").forEach((b) => b.classList.remove("border-brand", "bg-brand/10"));
        btn.classList.add("border-brand", "bg-brand/10");
      }
    }, p.icon);
    
    if (p.icon === oldIcon) btn.classList.add("border-brand", "bg-brand/10");
    presetGrid.append(btn);
  });
  
  let close;
  const save = primaryButton("Save Changes", async () => {
    const name = input.value.trim();
    if (!name) return toast("Enter a location name.", "error");
    try {
      await updateLocation(locationId, { name, icon: selectedIcon });
      toast("Location updated", "success");
      close();
      onReload();
    } catch (err) {
      toast(err.message || "Could not save.", "error");
    }
  });

  const remove = el("button", {
    class: "rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 px-5 py-2 text-sm font-bold transition active:scale-95",
    onClick: async () => {
      // Delete Protection: check if location has places
      const places = await listPlacesByLocation(locationId);
      if (!places.empty) {
        toast("Cannot delete location. It still contains storage places.", "error");
        return;
      }
      if (confirm(`Are you sure you want to delete "${oldName}"?`)) {
        try {
          await deleteDoc(doc(db, "locations", locationId));
          await logActivity(`Deleted location "${oldName}"`);
          toast("Location deleted", "success");
          close();
          onReload();
        } catch (err) {
          toast(err.message || "Failed to delete.", "error");
        }
      }
    }
  }, "Delete");

  close = modal(
    el("div", { class: "space-y-4" }, [
      el("div", {}, [
        el("h3", { class: "text-lg font-extrabold text-white" }, "Edit Location"),
        el("p", { class: "text-xs text-slate-400 mt-1" }, "Rename, change icon, or delete this location"),
      ]),
      input,
      el("div", {}, [
        el("label", { class: "block text-xs text-slate-400 font-bold mb-2" }, "Select Preset Icon"),
        presetGrid
      ]),
      el("div", { class: "flex justify-between items-center pt-2" }, [
        remove,
        el("div", { class: "flex gap-2.5" }, [
          el(
            "button",
            {
              class: "rounded-full px-5 py-2 text-sm font-bold text-slate-450 hover:bg-slate-800 transition active:scale-95",
              onClick: () => close(),
            },
            "Cancel"
          ),
          save,
        ])
      ]),
    ])
  );
}

export async function renderHome() {
  const list = el("div", { class: "flex flex-col gap-3" });
  const searchResults = el("div", { class: "flex flex-col gap-3 hidden" });
  
  const reloadHome = async () => {
    const snap = await listLocations();
    if (snap.empty) {
      list.replaceChildren(emptyState("No locations yet. Tap the '+' button below to get started."));
    } else {
      const cards = [];
      snap.forEach((docRef) => cards.push(locationCard(docRef, reloadHome)));
      list.replaceChildren(...cards);
    }
  };

  // --- Real-time Search ---
  const searchInput = el("input", {
    type: "text",
    placeholder: "Search items (e.g. soap, tool)...",
    class: "w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none transition-colors",
  });

  searchInput.addEventListener("input", async () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      searchResults.classList.add("hidden");
      list.classList.remove("hidden");
      return;
    }

    searchResults.classList.remove("hidden");
    list.classList.add("hidden");
    searchResults.replaceChildren(el("p", { class: "text-center text-xs text-slate-500 py-4" }, "Searching..."));

    try {
      const itemsSnap = await listAllItems();
      const placesSnap = await getDocs(collection(db, "places"));
      const locationsSnap = await getDocs(collection(db, "locations"));

      const placeMap = {};
      placesSnap.forEach((d) => placeMap[d.id] = d.data());

      const locationMap = {};
      locationsSnap.forEach((d) => locationMap[d.id] = d.data());

      const matches = [];
      itemsSnap.docs.forEach((itemDoc) => {
        const item = itemDoc.data();
        if (item.name?.toLowerCase().includes(q)) {
          matches.push({ id: itemDoc.id, data: item });
        }
      });

      if (matches.length === 0) {
        searchResults.replaceChildren(el("p", { class: "text-center text-xs text-slate-500 py-6 italic font-medium" }, `No items found matching "${q}"`));
      } else {
        const results = matches.map((m) => {
          const parentPlace = placeMap[m.data.placeId];
          const parentLocation = parentPlace ? locationMap[parentPlace.locationId] : null;
          const locationPath = parentLocation && parentPlace 
            ? `${parentLocation.name} › ${parentPlace.name}`
            : "Unknown Location";

          return el("a", {
            href: `#/place/${m.data.placeId}`,
            class: "flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 hover:border-brand/40 transition shadow-sm"
          }, [
            el("div", { class: "flex justify-between items-start" }, [
              el("span", { class: "font-bold text-slate-200 text-sm tracking-wide" }, m.data.name),
              m.data.quantity ? el("span", { class: "text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-bold text-slate-400 border border-slate-700" }, m.data.quantity) : null
            ]),
            el("span", { class: "text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5" }, locationPath)
          ]);
        });
        searchResults.replaceChildren(...results);
      }
    } catch (err) {
      console.error(err);
      searchResults.replaceChildren(el("p", { class: "text-center text-xs text-rose-400 py-4 font-semibold" }, "Search failed."));
    }
  });

  await reloadHome();

  // Floating Action Button (FAB) for adding new locations
  const fab = el(
    "button",
    {
      class: "fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-200",
      title: "Add location",
      onClick: () => openAddLocationDialog(reloadHome),
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

  return el("section", { class: "flex flex-col gap-4 px-4 py-4 min-h-[calc(100vh-160px)] relative" }, [
    el("div", {}, [
      el("h2", { class: "text-xl font-black text-slate-100 tracking-tight" }, "Your locations"),
      el("p", { class: "text-xs text-slate-400 mt-1 font-medium" }, "A location holds one or more storage places."),
    ]),
    searchInput,
    list,
    searchResults,
    fab,
  ]);
}
