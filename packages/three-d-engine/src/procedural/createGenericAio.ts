import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";
import { createGenericRadiator } from "./createGenericRadiator";

export interface GenericAioParams {
  radiatorSizeMm: number;
}

const PUMP_RADIUS_MM = 30;
const PUMP_HEIGHT_MM = 40;
// Fixed schematic offset from the radiator, standing in for the tubing run
// to wherever the pump/block actually sits on the CPU — not a real
// case-relative position (that's Milestone 3/4's zone system's job).
const PUMP_OFFSET_MM = 80;

export function createGenericAio(params: GenericAioParams): Group {
  const group = new Group();
  group.name = "GenericAio";

  const radiator = createGenericRadiator({ sizeMm: params.radiatorSizeMm });
  group.add(radiator);

  const pump = new Mesh(
    new CylinderGeometry(mm(PUMP_RADIUS_MM), mm(PUMP_RADIUS_MM), mm(PUMP_HEIGHT_MM), 24),
    new MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 }),
  );
  pump.position.set(0, -mm(PUMP_OFFSET_MM), 0);
  group.add(pump);

  return group;
}
