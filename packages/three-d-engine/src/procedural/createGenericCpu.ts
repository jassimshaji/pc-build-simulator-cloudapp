import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export interface GenericCpuParams {
  socket: string;
}

// A CPU's integrated heat spreader is roughly the same ~40mm square across
// modern desktop sockets (AM4/AM5/LGA1700/...) — not worth branching on
// `socket` for a generic placeholder shape. It's kept in the params shape to
// match ARCHITECTURE.md §7.3's documented generator signature and for any
// future per-socket differentiation.
const IHS_WIDTH_MM = 40;
const IHS_HEIGHT_MM = 4;

export function createGenericCpu(_params: GenericCpuParams): Group {
  const group = new Group();
  group.name = "GenericCpu";

  const ihs = new Mesh(
    new BoxGeometry(mm(IHS_WIDTH_MM), mm(IHS_HEIGHT_MM), mm(IHS_WIDTH_MM)),
    new MeshStandardMaterial({ color: 0xc0c0c8, metalness: 0.6, roughness: 0.3 }),
  );
  group.add(ihs);

  return group;
}
