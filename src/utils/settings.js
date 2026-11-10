// settings.js — global settings controller for SpaceRemind.
// Manages light/dark themes, layout density, and artwork styles.

const KEYS = {
  THEME: "spaceremind_theme",
  DENSITY: "spaceremind_density",
  ARTWORK: "spaceremind_artwork",
};

export function getTheme() {
  return localStorage.getItem(KEYS.THEME) || "dark";
}

export function setTheme(theme) {
  localStorage.setItem(KEYS.THEME, theme);
  applyTheme(theme);
}

export function getDensity() {
  return localStorage.getItem(KEYS.DENSITY) || "comfortable";
}

export function setDensity(density) {
  localStorage.setItem(KEYS.DENSITY, density);
  applyDensity(density);
}

export function getArtwork() {
  return localStorage.getItem(KEYS.ARTWORK) || "rich";
}

export function setArtwork(artwork) {
  localStorage.setItem(KEYS.ARTWORK, artwork);
  applyArtwork(artwork);
}

// Apply settings to the DOM (called on boot and on settings change)
export function initSettings() {
  applyTheme(getTheme());
  applyDensity(getDensity());
  applyArtwork(getArtwork());
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
}

function applyDensity(density) {
  const root = document.documentElement;
  if (density === "compact") {
    root.classList.add("density-compact");
  } else {
    root.classList.remove("density-compact");
  }
}

function applyArtwork(artwork) {
  const root = document.documentElement;
  if (artwork === "minimal") {
    root.classList.add("artwork-minimal");
  } else {
    root.classList.remove("artwork-minimal");
  }
}
