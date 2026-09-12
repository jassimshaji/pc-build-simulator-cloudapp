import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export type PsuFormFactor = "ATX" | "SFX" | "SFX-L";

export interface GenericPsuParams {
  formFactor: PsuFormFactor;
  length: number; // mm — depth of the unit, varies by wattage/model
}

// Standard PSU cross-sections (mm) — width x height of the front/rear face.
const CROSS_SECTION_MM: Record<PsuFormFactor, { width: number; height: number }> = {
  ATX: { width: 150, height: 86 },
  SFX: { width: 125, height: 63.5 },
  "SFX-L": { width: 125, height: 63.5 },
};

export function createGenericPsu(params: GenericPsuParams): Group {
  const { width, height } = CROSS_SECTION_MM[params.formFactor];
  const group = new Group();
  group.name = "GenericPsu";

  const body = new Mesh(
    new BoxGeometry(mm(width), mm(height), mm(params.length)),
    new MeshStandardMaterial({ color: 0x4b5563, roughness: 0.7 }),
  );
  group.add(body);

  // Fan grill on the top face.
  const fanRadius = Math.min(mm(width), mm(height)) * 0.4;
  const fan = new Mesh(
    new CylinderGeometry(fanRadius, fanRadius, mm(height) * 0.02, 24),
    new MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 }),
  );
  fan.position.set(0, mm(height) / 2 + mm(height) * 0.01, 0);
  group.add(fan);

  return group;
}
