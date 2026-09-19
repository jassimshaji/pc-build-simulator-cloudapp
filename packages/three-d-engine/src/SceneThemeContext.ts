import { createContext } from "react";
import { SCENE_THEMES, type SceneTheme } from "./sceneTheme";

// Lets anything inside the canvas (like AirflowStream) read the active scene
// theme without every intermediate component passing it down. WorkspaceCanvas
// provides it *inside* the <Canvas>, since React context does not cross the
// R3F reconciler boundary from outside.
export const SceneThemeContext = createContext<SceneTheme>(SCENE_THEMES.dark);
