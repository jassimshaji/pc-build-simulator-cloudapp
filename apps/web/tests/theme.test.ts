import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  nextTheme,
  parseTheme,
  resolveTheme,
  themeInitScript,
} from "@/lib/theme";

describe("theme helpers", () => {
  it("accepts only 'light' and 'dark'", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    for (const bad of ["", "Dark", "system", "auto", null, undefined, 1, {}]) {
      expect(parseTheme(bad)).toBeNull();
    }
  });

  it("falls back to the default (dark) for anything invalid", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(resolveTheme(null)).toBe("dark");
    expect(resolveTheme("<script>")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });

  it("toggles between the two themes", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });
});

describe("no-flash init script", () => {
  // Runs the exact script the layout injects, against a fake document/localStorage.
  function run(stored: string | null, opts: { storageThrows?: boolean } = {}) {
    const documentElement = { dataset: {} as Record<string, string> };
    const localStorage = {
      getItem(key: string) {
        if (opts.storageThrows) throw new Error("blocked");
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    };
    vm.runInNewContext(themeInitScript, { document: { documentElement }, localStorage });
    return documentElement.dataset.theme;
  }

  it("applies a saved theme", () => {
    expect(run("light")).toBe("light");
    expect(run("dark")).toBe("dark");
  });

  it("uses the default when nothing (or garbage) is saved", () => {
    expect(run(null)).toBe("dark");
    expect(run("purple")).toBe("dark");
  });

  it("never throws when storage is blocked", () => {
    expect(run(null, { storageThrows: true })).toBe("dark");
  });
});
