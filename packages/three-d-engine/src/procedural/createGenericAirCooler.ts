import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";
import { createGenericFan } from "./createGenericFan";

export interface GenericAirCoolerParams {
  heightMm: number;
  fanSizeMm?: number; // schema default: no explicit fan mounted if absent — falls back to 120mm
  dimensionsMm?: { width: number; depth: number };
}

const DEFAULT_WIDTH_MM = 130;
const DEFAULT_DEPTH_MM = 65;
const DEFAULT_FAN_SIZE_MM = 120;
const FAN_THICKNESS_MM = 25;

export function createGenericAirCooler(params: GenericAirCoolerParams): Group {
  const width = params.dimensionsMm?.width ?? DEFAULT_WIDTH_MM;
  const depth = params.dimensionsMm?.depth ?? DEFAULT_DEPTH_MM;
  const group = new Group();
  group.name = "GenericAirCooler";

  // Heatsink fin tower — a solid block standing in for the fin stack (per
  // ADR-004, generic geometry, not a literal fin-by-fin model).
  const tower = new Mesh(
    new BoxGeometry(mm(width), mm(params.heightMm), mm(depth)),
    new MeshStandardMaterial({ color: 0x71717a, roughness: 0.4, metalness: 0.5 }),
  );
  group.add(tower);

  // One fan mounted flush against the tower's front face, reusing
  // createGenericFan rather than duplicating its geometry.
  const fan = createGenericFan({ sizeMm: params.fanSizeMm ?? DEFAULT_FAN_SIZE_MM, thicknessMm: FAN_THICKNESS_MM });
  fan.position.set(0, 0, mm(depth) / 2 + mm(FAN_THICKNESS_MM) / 2);
  group.add(fan);

  return group;
}
