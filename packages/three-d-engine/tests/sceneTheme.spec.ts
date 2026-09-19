import { describe, expect, it } from "vitest";
import { DEFAULT_SCENE_THEME, SCENE_THEMES, getSceneTheme } from "../src/sceneTheme";

const HEX = /^#[0-9a-f]{6}$/i;

// Relative luminance of a #rrggbb colour (sRGB, WCAG).
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("scene themes", () => {
  it("defines every colour as a #rrggbb value for both themes", () => {
    for (const theme of Object.values(SCENE_THEMES)) {
      for (const colour of Object.values(theme)) expect(colour).toMatch(HEX);
    }
  });

  it("dark is a dark backdrop and light is a light one", () => {
    expect(luminance(SCENE_THEMES.dark.background)).toBeLessThan(0.05);
    expect(luminance(SCENE_THEMES.light.background)).toBeGreaterThan(0.85);
  });

  it("keeps the grid distinguishable from the backdrop in both themes", () => {
    for (const theme of Object.values(SCENE_THEMES)) {
      expect(theme.gridCell).not.toBe(theme.background);
      expect(theme.gridSection).not.toBe(theme.gridCell);
    }
  });

  it("gives the airflow particles enough contrast against their backdrop", () => {
    for (const theme of Object.values(SCENE_THEMES)) {
      for (const flow of [theme.flowIntake, theme.flowExhaust]) {
        const [light, dark] = [luminance(flow), luminance(theme.background)].sort((x, y) => y - x);
        expect((light + 0.05) / (dark + 0.05)).toBeGreaterThan(3); // WCAG large-graphics minimum
      }
    }
  });

  it("falls back to the default theme when none is given", () => {
    expect(getSceneTheme(undefined)).toEqual(SCENE_THEMES[DEFAULT_SCENE_THEME]);
    expect(getSceneTheme("light")).toEqual(SCENE_THEMES.light);
  });
});
