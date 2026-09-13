import type { InstallationZone } from "./types";

// Offsets a zone's local position by an origin (typically the world position
// of whatever component owns that zone). This is the composition step
// Milestones 2-3 explicitly deferred: a motherboard's own zones (RAM slots,
// PCIe slots, ...) are generated relative to the motherboard's own local
// origin — once the motherboard is actually placed in a case's MOBO_TRAY
// zone, its zones need to be re-expressed in world space by adding the
// MOBO_TRAY zone's own world position as the origin here.
export function composeZone(zone: InstallationZone, origin: [number, number, number]): InstallationZone {
  return {
    ...zone,
    position: [
      zone.position[0] + origin[0],
      zone.position[1] + origin[1],
      zone.position[2] + origin[2],
    ],
  };
}
