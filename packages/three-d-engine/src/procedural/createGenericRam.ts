import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export type RamFormFactor = "UDIMM" | "SODIMM";

export interface GenericRamParams {
  formFactor: RamFormFactor;
  height: number; // mm — module height above the slot (varies with heatspreader)
}

// Standard module lengths (mm) — the dimension that sits in the slot.
const LENGTH_MM: Record<RamFormFactor, number> = {
  UDIMM: 133,
  SODIMM: 67,
};

const THICKNESS_MM = 7;

export function createGenericRam(params: GenericRamParams): Group {
  const length = LENGTH_MM[params.formFactor];
  const group = new Group();
  group.name = "GenericRam";

  const stick = new Mesh(
    new BoxGeometry(mm(length), mm(params.height), mm(THICKNESS_MM)),
    new MeshStandardMaterial({ color: 0x52525b, roughness: 0.5 }),
  );
  group.add(stick);

  return group;
}
