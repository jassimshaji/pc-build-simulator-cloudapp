import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export interface GenericRadiatorParams {
  sizeMm: number; // total length along the fan row (120/240/280/360/420)
  thicknessMm?: number; // no schema default; ~27mm is typical
}

// Standard single-fan width regardless of how many fans the radiator spans.
const RADIATOR_WIDTH_MM = 120;
const DEFAULT_THICKNESS_MM = 27;

export function createGenericRadiator(params: GenericRadiatorParams): Group {
  const thicknessMm = params.thicknessMm ?? DEFAULT_THICKNESS_MM;
  const group = new Group();
  group.name = "GenericRadiator";

  const body = new Mesh(
    new BoxGeometry(mm(params.sizeMm), mm(RADIATOR_WIDTH_MM), mm(thicknessMm)),
    new MeshStandardMaterial({ color: 0x4b5563, roughness: 0.6, metalness: 0.3 }),
  );
  group.add(body);

  return group;
}
