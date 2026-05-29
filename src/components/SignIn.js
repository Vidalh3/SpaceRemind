// Sign-in screen — Google authentication gate shown when signed out.
import { signInWithGoogle } from "../api/auth.js";
import { el, toast } from "./ui.js";

export function renderSignIn(root) {
  const button = el(
    "button",
    {
      class: "flex items-center gap-3 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow hover:bg-slate-100",
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
    el("main", { class: "flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center" }, [
      el("div", {}, [
        el("h1", { class: "text-3xl font-bold tracking-tight" }, [
          "Space",
          el("span", { class: "text-brand" }, "Remind"),
        ]),
        el("p", { class: "mt-2 max-w-xs text-sm text-slate-400" },
          "Remember where you put everything — track items by location with photos, QR codes, and NFC tags."),
      ]),
      button,
    ])
  );
}
