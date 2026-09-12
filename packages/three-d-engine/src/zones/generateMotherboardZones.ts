import { mm } from "../procedural/units";
import type { InstallationZone } from "./types";

export interface MotherboardZoneSpec {
  ramSlots: number;
  pcieSlots: number;
  m2Slots: number;
  sataPorts: number;
}

// Generates every installation zone a motherboard hosts directly (CPU socket,
// RAM/PCIe/M.2/SATA slots), driven entirely by the motherboard's own slot
// *counts* from its specifications — never hand-authored per board model.
// Positions are schematic (a generic top-down layout, not any real board's
// exact silkscreen), same simplification principle as generateCaseZones.
//
// These positions are in the motherboard's own local space. Composing them
// with wherever the motherboard actually ends up once placed in a case's
// MOBO_TRAY zone is Milestone 4's job (click-to-place), not this function's.
// Spacing between same-group zones is deliberately much wider than any real
// board's slot pitch (e.g. real DIMM slots sit ~8mm apart) — these markers
// are a visual affordance meant to be individually distinguishable at normal
// viewing distance, not a to-scale replica, so spacing is chosen relative to
// the marker size rendering them (see WorkspaceCanvas's ZONE_MARKER_SIZE_MM),
// not the real component's pitch.
export function generateMotherboardZones(spec: MotherboardZoneSpec): InstallationZone[] {
  const zones: InstallationZone[] = [
    {
      key: "CPU_SOCKET",
      acceptsCategory: "CPU",
      position: [0, 0, mm(-70)],
      rotation: [0, 0, 0],
    },
  ];

  for (let i = 0; i < spec.ramSlots; i++) {
    zones.push({
      key: `RAM_SLOT_${i + 1}`,
      acceptsCategory: "RAM",
      position: [mm(70), 0, mm(-70) + i * mm(55)],
      rotation: [0, 0, 0],
    });
  }

  for (let i = 0; i < spec.pcieSlots; i++) {
    zones.push({
      key: `PCIE_SLOT_${i + 1}`,
      acceptsCategory: "GPU",
      position: [0, 0, mm(50) + i * mm(60)],
      rotation: [0, 0, 0],
    });
  }

  for (let i = 0; i < spec.m2Slots; i++) {
    zones.push({
      key: `M2_SLOT_${i + 1}`,
      acceptsCategory: "SSD",
      position: [mm(-70), 0, mm(20) + i * mm(55)],
      rotation: [0, 0, 0],
    });
  }

  for (let i = 0; i < spec.sataPorts; i++) {
    zones.push({
      key: `SATA_PORT_${i + 1}`,
      acceptsCategory: "SSD",
      position: [mm(100), 0, mm(50) + i * mm(45)],
      rotation: [0, 0, 0],
    });
  }

  return zones;
}
