// Small UI helpers shared across views — DOM creation, toasts, modals,
// and confirm dialogs. Keeps view code declarative and free of boilerplate.

// Create an element from a tag, attributes, and children.
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") {
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

// Transient toast notification.
export function toast(message, type = "info") {
  const colors = {
    info: "bg-slate-700",
    success: "bg-emerald-600",
    error: "bg-rose-600",
  };
  const t = el(
    "div",
    {
      class: `fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${colors[type] || colors.info}`,
      role: "status",
    },
    message
  );
  document.body.append(t);
  setTimeout(() => t.remove(), 2800);
}

// Modal dialog. `content` is a DOM node. Returns a close() function.
export function modal(content, { onClose } = {}) {
  const close = () => {
    overlay.remove();
    onClose?.();
  };
  const card = el(
    "div",
    { class: "w-full max-w-sm rounded-2xl bg-slate-800 p-5 shadow-xl", onClick: (e) => e.stopPropagation() },
    [content]
  );
  const overlay = el(
    "div",
    {
      class: "fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4",
      onClick: close,
    },
    [card]
  );
  document.body.append(overlay);
  return close;
}

// Promise-based confirm dialog.
export function confirmDialog(message, { confirmLabel = "Delete", danger = true } = {}) {
  return new Promise((resolve) => {
    let close;
    const buttons = el("div", { class: "mt-5 flex justify-end gap-2" }, [
      el(
        "button",
        {
          class: "rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700",
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
          class: `rounded-lg px-4 py-2 text-sm font-semibold text-white ${danger ? "bg-rose-600 hover:bg-rose-500" : "bg-brand hover:bg-brand-dark"}`,
          onClick: () => {
            close();
            resolve(true);
          },
        },
        confirmLabel
      ),
    ]);
    close = modal(
      el("div", {}, [
        el("p", { class: "text-sm text-slate-200" }, message),
        buttons,
      ]),
      { onClose: () => resolve(false) }
    );
  });
}

// Loading spinner element.
export function spinner(label = "Loading…") {
  return el("div", { class: "flex flex-col items-center gap-3 py-16 text-slate-400" }, [
    el("div", {
      class: "h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-brand",
    }),
    el("p", { class: "text-sm" }, label),
  ]);
}

// Empty-state placeholder.
export function emptyState(message) {
  return el(
    "div",
    { class: "flex flex-col items-center gap-3 py-16 text-center text-slate-500" },
    [
      el("svg", {
        class: "h-10 w-10 text-slate-700",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.5",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        html: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
      }),
      el("p", { class: "text-sm" }, message),
    ]
  );
}

// Primary button helper.
export function primaryButton(label, onClick, extra = "") {
  return el(
    "button",
    {
      class: `rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark ${extra}`,
      onClick,
    },
    label
  );
}
