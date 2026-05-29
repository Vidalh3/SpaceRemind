// AppShell — the authenticated layout. Builds the header + bottom nav around
// a content area, registers routes, and starts the router. Rendered after a
// user is signed in (see main.js).
import { el } from "./ui.js";
import { renderHeader } from "./Header.js";
import { route, startRouter } from "../router.js";

let routesRegistered = false;

// Each view is a separate chunk, dynamically imported when first navigated to.
function registerRoutes() {
  if (routesRegistered) return;
  route("/", async () => (await import("../views/Home.js")).renderHome());
  route("/place/:id", async (params) => (await import("../views/Place.js")).renderPlace(params.id));
  route("/scan", async () => (await import("../views/Scan.js")).renderScan());
  route("/reminders", async () => (await import("../views/Reminders.js")).renderReminders());
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
