import { BoxGeometry, EdgesGeometry, Group, LineBasicMaterial, LineSegments } from "three";
import { mm } from "./units";

export interface GenericCaseParams {
  formFactor: "ATX" | "Micro-ATX" | "Mini-ITX" | "E-ATX";
  dimensions: { width: number; height: number; depth: number }; // mm
}

// Renders as a wireframe shell only, not a solid box — components placed
// inside it later (installation zones/click-to-place land in Milestones 3-4)
// need to stay visible rather than hidden behind opaque panels. `formFactor`
// isn't used to vary the shape (the case's own `dimensions` already fully
// determine it) but is kept in the params shape to match ARCHITECTURE.md
// §7.3's documented generator signature.
export function createGenericCase(params: GenericCaseParams): Group {
  const { dimensions } = params;
  const group = new Group();
  group.name = "GenericCase";

  const geometry = new BoxGeometry(mm(dimensions.width), mm(dimensions.height), mm(dimensions.depth));
  const wireframe = new LineSegments(
    new EdgesGeometry(geometry),
    new LineBasicMaterial({ color: 0x71717a }),
  );
  group.add(wireframe);

  return group;
}
