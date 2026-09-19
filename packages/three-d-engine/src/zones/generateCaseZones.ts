import { mm } from "../procedural/units";
import type { InstallationZone } from "./types";

export type FanMountFace = "FRONT" | "REAR" | "TOP";

// The case spec only lists supported fan *sizes*, not where they mount, so
// mounts are assigned to faces by a fixed, conventional order: first the
// front (intake), then the rear (exhaust), then the top, then cycling. This is
// the single source of truth for a mount's face — airflow.ts derives flow
// direction from the same function rather than guessing from positions.
export function fanMountFace(index: number): FanMountFace {
  return (["FRONT", "REAR", "TOP"] as const)[index % 3];
}

export interface CaseZoneSpec {
  dimensions: { width: number; height: number; depth: number }; // mm
  maxGpuLengthMm: number;
  maxCpuCoolerHeightMm: number;
  driveBays?: Record<string, number>; // e.g. { "3.5in": 2, "2.5in": 2 }
  fanSupportMm?: number[]; // e.g. [120, 140] — one zone per entry (see note below)
  radiatorSupport?: string[]; // e.g. ["240mm front", "280mm front"] — one zone per entry
}

// Generates every installation zone a case hosts directly, from its own
// `specifications` — never hand-authored per case model (ARCHITECTURE.md
// §7.2). Positions are a simplified top-down "floor plan" schematic (X =
// case width, Z = case depth, Y = case height) rather than an attempt at a
// real ATX side-panel layout — consistent with ADR-004's "generic, not
// photorealistic" mandate for everything in this package.
//
// `fanSupportMm`/`radiatorSupport` list *supported sizes*, not a mount
// *count* (the schema has no separate count field) — this treats each array
// entry as exactly one mount position, which is simple, deterministic, and
// good enough for a generic model. GPU/cooler zones live here (not on the
// motherboard, even though a GPU physically plugs into a motherboard PCIe
// slot) because the case's own clearance fields (`maxGpuLengthMm`,
// `maxCpuCoolerHeightMm`) are what actually constrain them — composing this
// with a motherboard's own PCIe slot positions once one is actually placed
// is Milestone 4's job, not this function's.
export function generateCaseZones(spec: CaseZoneSpec): InstallationZone[] {
  const halfWidth = mm(spec.dimensions.width) / 2;
  const halfHeight = mm(spec.dimensions.height) / 2;
  const halfDepth = mm(spec.dimensions.depth) / 2;

  const zones: InstallationZone[] = [
    {
      key: "MOBO_TRAY",
      acceptsCategory: "MOTHERBOARD",
      position: [-halfWidth * 0.35, 0, -halfDepth * 0.1],
      rotation: [0, 0, 0],
    },
    {
      key: "PSU_BAY",
      acceptsCategory: "PSU",
      position: [-halfWidth * 0.6, -halfHeight * 0.7, halfDepth * 0.7],
      rotation: [0, 0, 0],
    },
    {
      key: "EXPANSION_SLOT_1",
      acceptsCategory: "GPU",
      position: [-halfWidth * 0.1, -halfHeight * 0.3, -halfDepth * 0.05],
      rotation: [0, 0, 0],
      constraints: { maxLengthMm: spec.maxGpuLengthMm },
    },
    {
      key: "CPU_COOLER_MOUNT",
      acceptsCategory: "AIR_COOLER",
      position: [-halfWidth * 0.35, halfHeight * 0.1, -halfDepth * 0.15],
      rotation: [0, 0, 0],
      constraints: { maxHeightMm: spec.maxCpuCoolerHeightMm },
    },
  ];

  (spec.radiatorSupport ?? []).forEach((label, index) => {
    zones.push({
      key: `RADIATOR_MOUNT_${index + 1}`,
      acceptsCategory: "AIO_COOLER",
      position: [-halfWidth * 0.5 + index * mm(150), halfHeight * 0.8, -halfDepth * 0.9],
      rotation: [0, 0, 0],
      constraints: { label },
    });
  });

  // Mounts already on each face, so several fans on the same face sit side by
  // side instead of overlapping.
  const perFaceCount: Record<FanMountFace, number> = { FRONT: 0, REAR: 0, TOP: 0 };
  (spec.fanSupportMm ?? []).forEach((sizeMm, index) => {
    const face = fanMountFace(index);
    const slot = perFaceCount[face]++;
    const sideOffset = -halfWidth * 0.3 + slot * mm(140);
    const position: [number, number, number] =
      face === "FRONT"
        ? [sideOffset, 0, -halfDepth * 0.9]
        : face === "REAR"
          ? [sideOffset, 0, halfDepth * 0.9]
          : [sideOffset, halfHeight * 0.9, 0];
    zones.push({
      key: `FAN_MOUNT_${index + 1}`,
      acceptsCategory: "FAN",
      position,
      rotation: [0, 0, 0],
      constraints: { sizeMm, face },
    });
  });

  let bayIndex = 0;
  for (const [bayType, count] of Object.entries(spec.driveBays ?? {})) {
    for (let i = 0; i < count; i++) {
      zones.push({
        key: `DRIVE_BAY_${bayIndex + 1}`,
        acceptsCategory: "SSD",
        position: [halfWidth * 0.7, -halfHeight * 0.2 + bayIndex * mm(30), 0],
        rotation: [0, 0, 0],
        constraints: { bayType },
      });
      bayIndex++;
    }
  }

  return zones;
}
