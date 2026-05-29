// AppShell — the authenticated layout. Builds the header + bottom nav around
// a content area, registers routes, and starts the router. Rendered after a
// user is signed in (see main.js).
import { el } from "./ui.js";
import { renderHeader } from "./Header.js";
import { route, startRouter } from "../router.js";
import { renderHome } from "../views/Home.js";
import { renderPlace } from "../views/Place.js";
import { renderScan } from "../views/Scan.js";
import { renderReminders } from "../views/Reminders.js";

let routesRegistered = false;

function registerRoutes() {
  if (routesRegistered) return;
  route("/", () => renderHome());
  route("/place/:id", (params) => renderPlace(params.id));
  route("/scan", () => renderScan());
  route("/reminders", () => renderReminders());
  routesRegistered = true;
}

export function renderAppShell(root, user) {
  const { header, nav } = renderHeader(user);
  const view = el("main", { id: "view", class: "flex-1 pb-4" });
  root.replaceChildren(
    el("div", { class: "flex min-h-screen flex-col" }, [header, view, nav])
  );
  // Refresh the nav's active-link highlighting on navigation.
  window.addEventListener("hashchange", () => {
    const fresh = renderHeader(user);
    nav.replaceChildren(...fresh.nav.children);
  });
  registerRoutes();
  startRouter(view);
}
