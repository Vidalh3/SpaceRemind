// Sign-in screen — Google authentication gate shown when signed out.
import { signInWithGoogle } from "../api/auth.js";
import { el, toast } from "./ui.js";

function featureItem(iconPath, text) {
  return el("div", { class: "flex items-center gap-2.5" }, [
    el("svg", {
      class: "h-4 w-4 flex-shrink-0 text-brand",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      html: iconPath,
    }),
    el("span", {}, text),
  ]);
}

export function renderSignIn(root) {
  const button = el(
    "button",
    {
      class: "flex w-full items-center justify-center gap-3 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow transition-colors hover:bg-slate-100",
      onClick: async () => {
        button.disabled = true;
        try {
          await signInWithGoogle();
          // onAuth observer in main.js re-renders the app.
        } catch (err) {
          console.error(err);
          toast(err.message || "Sign-in failed.", "error");
          button.disabled = false;
        }
      },
    },
    [
      el("img", {
        src: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
        alt: "",
        class: "h-5 w-5",
      }),
      "Continue with Google",
    ]
  );

  root.replaceChildren(
    el("main", { class: "flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center" }, [
      el("div", {}, [
        el("h1", { class: "text-3xl font-bold tracking-tight" }, [
          "Space",
          el("span", { class: "text-brand" }, "Remind"),
        ]),
        el("p", { class: "mt-2 max-w-xs text-sm text-slate-400" },
          "Remember where you put everything."),
      ]),
      el("div", { class: "w-full max-w-xs rounded-2xl border border-slate-800 bg-slate-900 p-6" }, [
        el("div", { class: "mb-5 flex flex-col gap-3 text-left text-xs text-slate-400" }, [
          featureItem(
            '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
            "Organize items by location and storage space"
          ),
          featureItem(
            '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2m4 0v4m-4 0h2"/>',
            "Find anything instantly with QR codes or NFC"
          ),
          featureItem(
            '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
            "Set reminders so nothing gets forgotten"
          ),
        ]),
        button,
      ]),
    ])
  );
}
