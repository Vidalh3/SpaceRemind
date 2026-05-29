// App chrome: a top header with the user's avatar/sign-out and a bottom
// navigation bar. Rendered once by AppShell; views mount into the content area.
import { signOutUser } from "../api/auth.js";
import { el } from "./ui.js";

function navLink(href, label, iconPath) {
  const active = (window.location.hash || "#/") === href;
  return el(
    "a",
    {
      href,
      class: `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-brand" : "text-slate-400"}`,
    },
    [
      el("svg", {
        class: "h-6 w-6",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.8",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        html: iconPath,
      }),
      label,
    ]
  );
}

export function renderHeader(user) {
  const header = el(
    "header",
    { class: "sticky top-0 z-10 flex items-center justify-between bg-slate-900/80 px-4 py-3 backdrop-blur" },
    [
      el("a", { href: "#/", class: "text-xl font-bold tracking-tight" }, [
        "Space",
        el("span", { class: "text-brand" }, "Remind"),
      ]),
      el("div", { class: "flex items-center gap-2" }, [
        user?.photoURL
          ? el("img", { src: user.photoURL, alt: "", class: "h-7 w-7 rounded-full", referrerpolicy: "no-referrer" })
          : null,
        el(
          "button",
          {
            class: "rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200",
            onClick: () => signOutUser(),
          },
          "Sign out"
        ),
      ]),
    ]
  );

  const nav = el(
    "nav",
    { class: "sticky bottom-0 z-10 flex border-t border-slate-800 bg-slate-900/90 backdrop-blur" },
    [
      navLink("#/", "Places", '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
      navLink("#/scan", "Scan", '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2m4 0v4m-4 0h2"/>'),
      navLink("#/reminders", "Reminders", '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
    ]
  );

  return { header, nav };
}
