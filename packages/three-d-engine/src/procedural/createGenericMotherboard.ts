import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export type MotherboardFormFactor = "ATX" | "Micro-ATX" | "Mini-ITX" | "E-ATX";

export interface GenericMotherboardParams {
  formFactor: MotherboardFormFactor;
}

// Standard PCB footprints (mm) per form factor — the widely-used reference
// dimensions for each spec, not any one manufacturer's exact board.
const FOOTPRINT_MM: Record<MotherboardFormFactor, { width: number; depth: number }> = {
  "Mini-ITX": { width: 170, depth: 170 },
  "Micro-ATX": { width: 244, depth: 244 },
  ATX: { width: 305, depth: 244 },
  "E-ATX": { width: 305, depth: 330 },
};

const BOARD_THICKNESS_MM = 3;

export function createGenericMotherboard(params: GenericMotherboardParams): Group {
  const { width, depth } = FOOTPRINT_MM[params.formFactor];
  const group = new Group();
  group.name = "GenericMotherboard";

  const board = new Mesh(
    new BoxGeometry(mm(width), mm(BOARD_THICKNESS_MM), mm(depth)),
    new MeshStandardMaterial({ color: 0x1e7a54, roughness: 0.8 }),
  );
  group.add(board);

  return group;
}
