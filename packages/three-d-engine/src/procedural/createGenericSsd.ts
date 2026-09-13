import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export type SsdFormFactor = "M.2 NVMe" | "M.2 SATA" | "SATA 2.5\"";

export interface GenericSsdParams {
  formFactor: SsdFormFactor;
}

// Standard footprints (mm) — M.2 2280 (the overwhelmingly common size) for
// both NVMe and SATA M.2 drives, and the 2.5" SATA drive form factor.
const DIMENSIONS_MM: Record<SsdFormFactor, { length: number; width: number; thickness: number }> = {
  "M.2 NVMe": { length: 80, width: 22, thickness: 2.3 },
  "M.2 SATA": { length: 80, width: 22, thickness: 2.3 },
  "SATA 2.5\"": { length: 100.2, width: 69.85, thickness: 7 },
};

export function createGenericSsd(params: GenericSsdParams): Group {
  const dims = DIMENSIONS_MM[params.formFactor];
  const group = new Group();
  group.name = "GenericSsd";

  const body = new Mesh(
    new BoxGeometry(mm(dims.length), mm(dims.thickness), mm(dims.width)),
    new MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.6 }),
  );
  group.add(body);

  return group;
}
