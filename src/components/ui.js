// UI helpers following Material Design 3 (Material You) guidelines.
// Keeps layouts declarative and uses organic rounded corners, pill-shaped buttons,
// and tinted container backgrounds.

// Create an element from a tag, attributes, and children.
// Handles SVG namespaces correctly to prevent missing icons on mobile WebViews.
export function el(tag, attrs = {}, children = []) {
  const isSvg = tag === "svg" || tag === "path" || tag === "rect" || tag === "circle" || tag === "line";
  const node = isSvg
    ? document.createElementNS("http://www.w3.org/2000/svg", tag)
    : document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") {
      if (isSvg) node.setAttribute("class", v);
      else node.className = v;
    } else if (k === "html") {
      node.innerHTML = v;
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v != null && v !== false) {
      node.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

// Material 3 Toast Notification (Snackbar-style)
export function toast(message, type = "info") {
  const colors = {
    info: "border-slate-700 bg-slate-800/90 text-slate-100",
    success: "border-emerald-800 bg-emerald-950/90 text-emerald-200",
    error: "border-rose-800 bg-rose-950/90 text-rose-200",
  };
  
  // Remove existing toasts first to prevent stacking clutters
  document.querySelectorAll(".m3-toast").forEach((t) => t.remove());

  const t = el(
    "div",
    {
      class: `m3-toast fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-xl backdrop-blur-md flex items-center gap-3 transition-all duration-300 animate-slide-up ${colors[type] || colors.info}`,
      role: "status",
      style: "animation: slideUp 0.25s cubic-bezier(0, 0, 0.2, 1);",
    },
    message
  );
  
  // Inject slideUp animation style if not already in document
  if (!document.getElementById("m3-toast-style")) {
    const styleNode = el("style", { id: "m3-toast-style" }, [
      `@keyframes slideUp {
        from { transform: translate(-50%, 20px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }`
    ]);
    document.head.appendChild(styleNode);
  }

  document.body.append(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translate(-50%, 10px)";
    t.style.transition = "all 0.2s ease";
    setTimeout(() => t.remove(), 200);
  }, 2800);
}

// Material 3 Modal Dialog.
export function modal(content, { onClose } = {}) {
  const close = () => {
    card.style.transform = "scale(0.95)";
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.remove();
      onClose?.();
    }, 180);
  };
  
  const card = el(
    "div",
    { 
      class: "w-full max-w-sm rounded-[28px] border border-slate-800/80 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl transition-all duration-200 scale-95 opacity-0", 
      onClick: (e) => e.stopPropagation(),
      style: "transform: scale(0.95); opacity: 0; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);"
    },
    [content]
  );
  
  const overlay = el(
    "div",
    {
      class: "fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm opacity-0 transition-opacity duration-200",
      onClick: close,
    },
    [card]
  );

  document.body.append(overlay);
  
  // Trigger entry animation
  setTimeout(() => {
    overlay.style.opacity = "1";
    card.style.transform = "scale(1)";
    card.style.opacity = "1";
  }, 20);

  return close;
}

// Material 3 Promise-based confirm dialog.
export function confirmDialog(message, { confirmLabel = "Delete", danger = true } = {}) {
  return new Promise((resolve) => {
    let close;
    const buttons = el("div", { class: "mt-6 flex justify-end gap-3" }, [
      el(
        "button",
        {
          class: "rounded-full px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition active:scale-95",
          onClick: () => {
            close();
            resolve(false);
          },
        },
        "Cancel"
      ),
      el(
        "button",
        {
          class: `rounded-full px-5 py-2 text-sm font-semibold text-white transition active:scale-95 ${danger ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/35" : "bg-brand hover:bg-brand-dark shadow-indigo-900/35"} shadow`,
          onClick: () => {
            close();
            resolve(true);
          },
        },
        confirmLabel
      ),
    ]);
    
    close = modal(
      el("div", { class: "space-y-4" }, [
        el("h3", { class: "text-lg font-bold text-white" }, "Confirm Action"),
        el("p", { class: "text-sm leading-relaxed text-slate-300" }, message),
        buttons,
      ]),
      { onClose: () => resolve(false) }
    );
  });
}

// Loading spinner element.
export function spinner(label = "Loading…") {
  return el("div", { class: "flex flex-col items-center gap-4 py-20 text-slate-400" }, [
    el("div", {
      class: "h-9 w-9 animate-spin rounded-full border-[3px] border-slate-700 border-t-brand",
    }),
    el("p", { class: "text-sm font-medium" }, label),
  ]);
}

// Empty-state placeholder.
export function emptyState(message) {
  return el(
    "div",
    { class: "flex flex-col items-center gap-3 py-16 text-center text-slate-500" },
    [
      el("div", { class: "text-3xl" }, "📦"),
      el("p", { class: "text-sm font-medium max-w-[240px]" }, message)
    ]
  );
}

// Material 3 Primary pill-shaped button helper.
export function primaryButton(label, onClick, extra = "") {
  return el(
    "button",
    {
      class: `rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow shadow-indigo-900/20 hover:bg-brand-dark transition duration-200 active:scale-95 ${extra}`,
      onClick,
    },
    label
  );
}
