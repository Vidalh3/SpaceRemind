// AppShell — the top-level UI container.
// This is a placeholder shell for the scaffold; the real screens
// (Setup, Catalog, Scanner, Place inventory) will be built on top of it.
export function renderAppShell(root) {
  root.innerHTML = `
    <header class="sticky top-0 z-10 bg-slate-900/80 px-4 py-3 backdrop-blur">
      <h1 class="text-xl font-bold tracking-tight text-white">
        Space<span class="text-brand">Remind</span>
      </h1>
    </header>
    <main class="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <p class="text-lg font-medium text-slate-200">Scaffold ready 🚀</p>
      <p class="max-w-xs text-sm text-slate-400">
        Project structure, Tailwind, and Firebase/QR/NFC modules are in place.
        UI screens come next.
      </p>
    </main>
  `;
}
