import { getActiveSpaceId, setActiveSpaceId, listAvailableSpaces } from "../api/spaces.js";
import { signOutUser } from "../api/auth.js";
import { el } from "./ui.js";

function navLink(href, label, iconPath) {
  const active = (window.location.hash || "#/") === href;
  
  // Icon wrapper behaves as the active capsule pill in Material You bottom nav
  const iconWrapper = el(
    "div",
    {
      class: `flex items-center justify-center rounded-full w-14 h-8 transition-all duration-200 ${
        active 
          ? "bg-brand/20 text-brand scale-105" 
          : "text-slate-400 hover:bg-slate-800/40"
      }`
    },
    [
      el("svg", {
        class: "h-5 w-5",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": active ? "2.2" : "1.8",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        html: iconPath,
      })
    ]
  );

  return el(
    "a",
    {
      href,
      class: "flex flex-1 flex-col items-center justify-center py-1 transition-all",
    },
    [
      iconWrapper,
      el(
        "span",
        {
          class: `mt-1 text-[10px] font-bold tracking-wider transition-colors duration-200 ${
            active ? "text-slate-100 font-extrabold" : "text-slate-500"
          }`,
        },
        label
      ),
    ]
  );
}

export function renderHeader(user) {
  const spaceSelect = el("select", {
    class: "bg-transparent text-[11px] font-semibold text-slate-400 hover:text-slate-200 border-none outline-none focus:ring-0 max-w-[140px] truncate cursor-pointer py-0 px-0 mt-0.5",
    onChange: (e) => {
      setActiveSpaceId(e.target.value);
      window.location.reload();
    }
  }, [
    el("option", { value: "", disabled: true }, "Loading spaces...")
  ]);

  // Load spaces asynchronously
  listAvailableSpaces().then((spaces) => {
    const activeId = getActiveSpaceId();
    const options = spaces.map((s) => el("option", {
      value: s.id,
      selected: s.id === activeId,
      class: "bg-slate-900 text-slate-100"
    }, s.name));
    spaceSelect.replaceChildren(...options);
  }).catch(console.error);

  const header = el(
    "header",
    {
      class: "sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/90 px-4 py-3 shadow-sm backdrop-blur-md",
      style: "padding-top: calc(12px + env(safe-area-inset-top, 0px));",
    },
    [
      el("div", { class: "flex flex-col items-start" }, [
        el("a", { href: "#/", class: "text-lg font-black tracking-tight text-white hover:opacity-90 leading-none" }, [
          "Space",
          el("span", { class: "text-brand" }, "Remind"),
        ]),
        spaceSelect
      ]),
      el("div", { class: "flex items-center gap-3" }, [
        user?.photoURL
          ? el("img", {
               src: user.photoURL,
               alt: "",
               class: "h-7 w-7 rounded-full ring-2 ring-brand/35",
               referrerpolicy: "no-referrer",
            })
          : null,
        el(
          "button",
          {
            class: "rounded-full border border-slate-700/80 px-3.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 active:scale-95",
            onClick: () => signOutUser(),
          },
          "Sign out"
        ),
      ]),
    ]
  );

  const nav = el(
    "nav",
    { class: "sticky bottom-0 z-10 flex border-t border-slate-800/80 bg-slate-900/95 py-2 px-4 shadow-lg backdrop-blur-md justify-around items-center h-20" },
    [
      navLink("#/", "Places", '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
      navLink("#/scan", "Scan", '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2m4 0v4m-4 0h2"/>'),
      navLink("#/reminders", "Reminders", '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
      navLink("#/settings", "Settings", '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    ]
  );

  return { header, nav };
}
