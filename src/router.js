// Tiny hash-based router for the SPA.
// Routes map a hash pattern (with :params) to an async render(mount, params)
// function. On first load, a `?place=<id>` deep link (from a scanned QR code
// or tapped NFC tag) is rewritten to `#/place/<id>`.
import { spinner } from "./components/ui.js";

const routes = [];

export function route(pattern, render) {
  // "/place/:id" -> regex with named groups
  const names = [];
  const regex = new RegExp(
    "^#" +
      pattern.replace(/:[^/]+/g, (m) => {
        names.push(m.slice(1));
        return "([^/]+)";
      }) +
      "$"
  );
  routes.push({ regex, names, render });
}

export function navigate(hash) {
  if (window.location.hash === hash) handleRoute();
  else window.location.hash = hash;
}

// Convert an incoming QR/NFC deep link into an in-app route.
function consumeDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const placeId = params.get("place");
  if (placeId) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = `#/place/${placeId}`;
    window.history.replaceState(null, "", url);
  }
}

let mountEl = null;

async function handleRoute() {
  const hash = window.location.hash || "#/";
  for (const { regex, names, render } of routes) {
    const match = hash.match(regex);
    if (!match) continue;
    const params = Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(match[i + 1])]));
    mountEl.replaceChildren(spinner());
    try {
      const view = await render(params);
      if (view) mountEl.replaceChildren(view);
    } catch (err) {
      console.error(err);
      mountEl.replaceChildren(
        Object.assign(document.createElement("p"), {
          className: "px-4 py-16 text-center text-sm text-rose-400",
          textContent: err.message || "Something went wrong.",
        })
      );
    }
    return;
  }
  navigate("#/");
}

export function startRouter(mount) {
  mountEl = mount;
  consumeDeepLink();
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}
