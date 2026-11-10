// Sign-in screen — Google & Email authentication gate shown when signed out.
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "../api/auth.js";
import { el, toast } from "./ui.js";

export function renderSignIn(root) {
  let isSignUp = false;
  let loading = false;

  function update() {
    const title = isSignUp ? "Create Account" : "Welcome Back";
    const submitLabel = isSignUp ? "Sign Up" : "Sign In";
    const toggleText = isSignUp
      ? "Already have an account? Sign In"
      : "Don't have an account? Sign Up";

    const emailInput = el("input", {
      type: "email",
      required: true,
      placeholder: "name@example.com",
      class: "w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
    });

    const passwordInput = el("input", {
      type: "password",
      required: true,
      placeholder: "••••••••",
      class: "w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
    });

    const submitBtn = el(
      "button",
      {
        type: "submit",
        class: "w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50",
        disabled: loading,
      },
      loading ? "Please wait..." : submitLabel
    );

    const googleBtn = el(
      "button",
      {
        type: "button",
        class: "flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow transition hover:bg-slate-100 disabled:opacity-50",
        disabled: loading,
        onClick: async () => {
          loading = true;
          update();
          try {
            await signInWithGoogle();
          } catch (err) {
            console.error(err);
            toast(err.message || "Sign-in failed.", "error");
            loading = false;
            update();
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

    const form = el(
      "form",
      {
        class: "flex w-full flex-col gap-4",
        onSubmit: async (e) => {
          e.preventDefault();
          const email = emailInput.value.trim();
          const password = passwordInput.value;

          if (!email || !password) {
            toast("Please fill in all fields.", "error");
            return;
          }

          loading = true;
          update();

          try {
            if (isSignUp) {
              await signUpWithEmail(email, password);
              toast("Account created successfully!", "success");
            } else {
              await signInWithEmail(email, password);
              toast("Signed in successfully!", "success");
            }
          } catch (err) {
            console.error(err);
            let msg = err.message || "Authentication failed.";
            if (err.code === "auth/invalid-credential") {
              msg = "Incorrect email or password.";
            } else if (err.code === "auth/email-already-in-use") {
              msg = "This email is already registered.";
            } else if (err.code === "auth/weak-password") {
              msg = "Password should be at least 6 characters.";
            }
            toast(msg, "error");
            loading = false;
            update();
          }
        },
      },
      [
        el("div", { class: "flex flex-col gap-1.5 text-left" }, [
          el("label", { class: "text-xs font-semibold text-slate-300" }, "Email Address"),
          emailInput,
        ]),
        el("div", { class: "flex flex-col gap-1.5 text-left" }, [
          el("label", { class: "text-xs font-semibold text-slate-300" }, "Password"),
          passwordInput,
        ]),
        submitBtn,
      ]
    );

    const toggleLink = el(
      "button",
      {
        type: "button",
        class: "text-xs font-medium text-brand hover:underline focus:outline-none",
        onClick: () => {
          isSignUp = !isSignUp;
          update();
        },
      },
      toggleText
    );

    const container = el(
      "main",
      {
        class: "flex min-h-screen flex-col items-center justify-center bg-slate-900 px-6 py-8",
        style: "padding-top: calc(32px + env(safe-area-inset-top, 0px));",
      },
      [
        el("div", { class: "w-full max-w-md space-y-6" }, [
          // Header Logo & Text
          el("div", { class: "text-center space-y-2" }, [
            el("h1", { class: "text-3xl font-extrabold tracking-tight text-white" }, [
              "Space",
              el("span", { class: "text-brand" }, "Remind"),
            ]),
            el("p", { class: "max-w-sm mx-auto text-sm text-slate-400" },
              "Remember where you put everything — track items by location with photos, QR codes, and NFC tags."),
          ]),
          // Authentication Card
          el("div", { class: "rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl space-y-6" }, [
            el("div", { class: "space-y-1.5 text-center" }, [
              el("h2", { class: "text-xl font-bold text-white" }, title),
              el("p", { class: "text-xs text-slate-400" }, isSignUp ? "Register a new email and password account" : "Sign in using your email credentials"),
            ]),
            form,
            el("div", { class: "relative flex items-center justify-center py-2" }, [
              el("div", { class: "absolute inset-0 flex items-center" }, [
                el("div", { class: "w-full border-t border-slate-800" }),
              ]),
              el("span", { class: "relative bg-slate-900 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider" }, "or"),
            ]),
            googleBtn,
            el("div", { class: "text-center pt-2" }, toggleLink),
          ]),
        ]),
      ]
    );

    root.replaceChildren(container);
  }

  update();
}
