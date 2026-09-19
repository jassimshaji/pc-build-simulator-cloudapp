"use client";

import { useCallback, useState } from "react";
import type { PlacedComponent } from "@pcbuilder/three-d-engine";
import {
  addToLines,
  placementFromComponent,
  removeFromLines,
  removePlacementsOf,
} from "@/lib/buildDraft";
import type { BuildLine, ComponentSummary, InitialBuild } from "@/types/workspace";

// The in-progress build: its lines (a component and a quantity) and which zone
// each placed component occupies. The actual transitions are pure functions in
// lib/buildDraft.ts; this hook just holds the state.
export function useBuildDraft(initial?: Pick<InitialBuild, "buildLines" | "placements">) {
  const [buildLines, setBuildLines] = useState<BuildLine[]>(initial?.buildLines ?? []);
  const [placements, setPlacements] = useState<Record<string, PlacedComponent>>(initial?.placements ?? {});

  // Adds one unit, and — when a zone is given — places it there too.
  const addComponent = useCallback((component: ComponentSummary, zoneKey?: string | null) => {
    setBuildLines((lines) => addToLines(lines, component));
    if (zoneKey) {
      setPlacements((current) => ({ ...current, [zoneKey]: placementFromComponent(component) }));
    }
  }, []);

  const removeComponent = useCallback((componentId: string) => {
    setBuildLines((lines) => removeFromLines(lines, componentId));
    setPlacements((current) => removePlacementsOf(current, componentId));
  }, []);

  return { buildLines, placements, addComponent, removeComponent };
}
