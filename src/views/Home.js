// Home view — the Setup screen. Lists the user's Locations, each expandable
// to its Places. Supports creating Locations and Places. Tapping a Place
// opens its inventory (#/place/:id).
import {
  listLocations,
  listPlacesByLocation,
  createLocation,
  createPlace,
} from "../api/places.js";
import { el, emptyState, primaryButton, toast } from "../components/ui.js";

// Inline "add" form: a text input + button that calls onSubmit(value).
function addForm(placeholder, label, onSubmit) {
  const input = el("input", {
    type: "text",
    placeholder,
    class: "flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none",
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
  return el("div", { class: "flex gap-2" }, [input, primaryButton(label, submit)]);
}

async function placesList(locationId) {
  const wrap = el("div", { class: "mt-2 flex flex-col gap-1 pl-3" });
  const snap = await listPlacesByLocation(locationId);
  if (snap.empty) {
    wrap.append(el("p", { class: "py-1 text-xs text-slate-500" }, "No places yet."));
  } else {
    snap.forEach((doc) => {
      const place = doc.data();
      wrap.append(
        el(
          "a",
          {
            href: `#/place/${doc.id}`,
            class: "flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800",
          },
          [
            place.name,
            el("svg", { class: "h-4 w-4 text-slate-600", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", html: '<path d="m9 18 6-6-6-6"/>' }),
          ]
        )
      );
    });
  }
  wrap.append(
    el("div", { class: "mt-1" }, [
      addForm("New place (e.g. Under Sink Cabinet)", "Add", async (name) => {
        await createPlace({ locationId, name });
        const fresh = await placesList(locationId);
        wrap.replaceWith(fresh);
      }),
    ])
  );
  return wrap;
}

function locationCard(doc) {
  const location = doc.data();
  const body = el("div", { class: "hidden" });
  let loaded = false;
  const chevron = el("svg", {
    class: "h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-200",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    html: '<path d="m6 9 6 6 6-6"/>',
  });
  const header = el(
    "button",
    {
      class: "flex w-full items-center justify-between px-4 py-3 text-left",
      onClick: async () => {
        const isHidden = body.classList.toggle("hidden");
        chevron.style.transform = isHidden ? "" : "rotate(180deg)";
        if (!isHidden && !loaded) {
          loaded = true;
          body.replaceChildren(await placesList(doc.id));
        }
      },
    },
    [
      el("span", { class: "font-semibold" }, location.name),
      chevron,
    ]
  );
  return el("div", { class: "overflow-hidden rounded-xl border border-slate-800 bg-slate-900" }, [
    header,
    el("div", { class: "px-4 pb-3" }, [body]),
  ]);
}

export async function renderHome() {
  const list = el("div", { class: "flex flex-col gap-3" });
  const snap = await listLocations();
  if (snap.empty) {
    list.append(emptyState("No locations yet. Add one below to get started."));
  } else {
    snap.forEach((doc) => list.append(locationCard(doc)));
  }

  return el("section", { class: "flex flex-col gap-5 px-4 py-4" }, [
    el("div", {}, [
      el("h2", { class: "text-lg font-semibold" }, "Your locations"),
      el("p", { class: "text-sm text-slate-400" }, "A location holds one or more storage places."),
    ]),
    list,
    el("div", { class: "rounded-xl border border-dashed border-slate-700 p-3" }, [
      addForm("New location (e.g. Kitchen)", "Add", async (name) => {
        await createLocation({ name });
        toast("Location added", "success");
        const fresh = await renderHome();
        document.getElementById("view").replaceChildren(fresh);
      }),
    ]),
  ]);
}
