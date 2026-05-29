import "./style.css";
import { onAuth } from "./api/auth.js";
import { isFirebaseConfigured } from "./api/firebase.js";
import { renderSignIn } from "./components/SignIn.js";
import { renderAppShell } from "./components/AppShell.js";
import { el, spinner } from "./components/ui.js";

const root = document.querySelector("#app");
root.replaceChildren(spinner("Starting…"));

function renderConfigNeeded() {
  root.replaceChildren(
    el("main", { class: "flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center" }, [
      el("h1", { class: "text-2xl font-bold" }, ["Space", el("span", { class: "text-brand" }, "Remind")]),
      el("p", { class: "max-w-sm text-sm text-slate-400" },
        "Firebase isn't configured yet. Copy .env.example to .env, add your Firebase project's keys, then restart the dev server."),
      el("code", { class: "rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300" }, "cp .env.example .env"),
    ])
  );
}

function startAuthFlow() {
  let booted = false;
  // Render the right surface whenever auth state changes.
  onAuth((user) => {
    if (user) {
      // Only build the shell once; the router handles subsequent navigation.
      if (!booted) {
        booted = true;
        renderAppShell(root, user);
      }
    } else {
      booted = false;
      renderSignIn(root);
    }
  });
}

// Without Firebase credentials the app can't talk to a backend — guide the
// developer to set up .env rather than showing a broken screen.
if (isFirebaseConfigured()) startAuthFlow();
else renderConfigNeeded();
