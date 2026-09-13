import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export interface GenericFanParams {
  sizeMm: number;
  thicknessMm?: number; // fan spec schema has no default; ~25mm is standard for case fans
}

const DEFAULT_THICKNESS_MM = 25;

export function createGenericFan(params: GenericFanParams): Group {
  const thicknessMm = params.thicknessMm ?? DEFAULT_THICKNESS_MM;
  const group = new Group();
  group.name = "GenericFan";

  const frame = new Mesh(
    new BoxGeometry(mm(params.sizeMm), mm(params.sizeMm), mm(thicknessMm)),
    new MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 }),
  );
  group.add(frame);

  // A 7-sided cylinder standing in for a blade hub — a loose visual cue for
  // fan blades, not literal blade geometry (per ADR-004, generic/schematic
  // is the point). Axis rotated to point along Z, matching how fans mount
  // flat against a case wall in this package's zone layout.
  const bladeRadius = mm(params.sizeMm) * 0.42;
  const blades = new Mesh(
    new CylinderGeometry(bladeRadius, bladeRadius, mm(thicknessMm) * 0.7, 7),
    new MeshStandardMaterial({ color: 0x52525b, roughness: 0.5 }),
  );
  blades.rotation.x = Math.PI / 2;
  group.add(blades);

  return group;
}
