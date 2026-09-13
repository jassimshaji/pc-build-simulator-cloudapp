import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export interface GenericCaseLcdParams {
  displaySizeInches: number;
}

const PANEL_THICKNESS_MM = 8;

// A "placeholder surface" per DEVELOPMENT_ROADMAP.md — a flat panel sized
// from the display's diagonal (approximated as square, since case LCDs vary
// widely in aspect ratio and the schema doesn't carry one), with a subtle
// emissive tint as the only cue that it's a display rather than a generic
// box. No documented signature in ARCHITECTURE.md §7.3 for this category.
export function createGenericCaseLcd(params: GenericCaseLcdParams): Group {
  const diagonalMm = params.displaySizeInches * 25.4;
  const sizeMm = diagonalMm / Math.SQRT2;

  const group = new Group();
  group.name = "GenericCaseLcd";

  const panel = new Mesh(
    new BoxGeometry(mm(sizeMm), mm(sizeMm), mm(PANEL_THICKNESS_MM)),
    new MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.2,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.15,
    }),
  );
  group.add(panel);

  return group;
}
