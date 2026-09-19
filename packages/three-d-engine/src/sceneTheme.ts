// Colours for the parts of the 3D scene that have to follow the app's
// light/dark theme: the backdrop, the reference grid and the airflow particles
// (which need a darker shade on a light backdrop to stay visible). (The case wireframe,
// zone markers and component colours read on both backgrounds, so they're
// deliberately theme-independent.) Pure data, so the renderer and tests share it.

export type SceneThemeName = "light" | "dark";

export interface SceneTheme {
  background: string;
  gridCell: string;
  gridSection: string;
  flowIntake: string; // airflow particles moving into the case
  flowExhaust: string; // airflow particles leaving it
}

export const SCENE_THEMES: Record<SceneThemeName, SceneTheme> = {
  dark: {
    background: "#09090b",
    gridCell: "#27272a",
    gridSection: "#3f3f46",
    flowIntake: "#38bdf8",
    flowExhaust: "#fb923c",
  },
  light: {
    background: "#f4f4f5",
    gridCell: "#d4d4d8",
    gridSection: "#a1a1aa",
    flowIntake: "#0369a1",
    flowExhaust: "#c2410c",
  },
};

export const DEFAULT_SCENE_THEME: SceneThemeName = "dark";

export function getSceneTheme(name: SceneThemeName | undefined): SceneTheme {
  return SCENE_THEMES[name ?? DEFAULT_SCENE_THEME] ?? SCENE_THEMES[DEFAULT_SCENE_THEME];
}
