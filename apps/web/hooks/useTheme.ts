"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY, nextTheme, parseTheme, type Theme } from "@/lib/theme";

// The <html data-theme="..."> attribute is the single source of truth (the
// inline script in the root layout sets it before first paint), so this is a
// tiny external store over it rather than React state + a context provider:
// any component can call useTheme() and they all stay in sync, with no provider
// to mount and no flash of the wrong theme.

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the preference.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      const theme = parseTheme(event.newValue);
      if (theme) document.documentElement.dataset.theme = theme;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = (): Theme => parseTheme(document.documentElement.dataset.theme) ?? DEFAULT_THEME;
// During server render / hydration there is no DOM to ask; React re-renders
// with the real value right after hydration.
const getServerSnapshot = (): Theme => DEFAULT_THEME;

export function setTheme(theme: Theme) {
  // Enable the colour transition only once a user actually switches, so the
  // first paint is never animated.
  document.documentElement.classList.add("theme-ready");
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this page view.
  }
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggleTheme = useCallback(() => setTheme(nextTheme(getSnapshot())), []);
  return { theme, setTheme, toggleTheme };
}
