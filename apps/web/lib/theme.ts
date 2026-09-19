// Theme (light / dark) primitives shared by the inline no-flash script, the
// useTheme hook and the tests. Pure — no DOM access here.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pcbuilder-theme";

// The app was designed as a dark "engineering tool", so that stays the default
// until a visitor picks otherwise (the choice is then remembered).
export const DEFAULT_THEME: Theme = "dark";

export function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

// Anything that isn't a valid stored theme (nothing stored, a stale value from
// an older version, tampering) falls back to the default.
export function resolveTheme(stored: unknown): Theme {
  return parseTheme(stored) ?? DEFAULT_THEME;
}

export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

// Runs in <head> before first paint so the page never flashes the wrong
// theme. Kept dependency-free and try/catch-wrapped: localStorage can throw
// (private mode, blocked storage), and a broken script must never break the page.
export const themeInitScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});d.dataset.theme=(t==="light"||t==="dark")?t:${JSON.stringify(DEFAULT_THEME)};}catch(e){d.dataset.theme=${JSON.stringify(
  DEFAULT_THEME,
)};}})();`;
