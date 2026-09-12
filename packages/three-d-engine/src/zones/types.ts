import type { CategoryKey } from "@pcbuilder/component-models";

// Matches ARCHITECTURE.md §7.2 exactly. `position`/`rotation` are in the
// owning component's own local space (scene units — see procedural/units.ts)
// — composing a zone's position with wherever its owning component actually
// ends up in world space (once a case/motherboard is really placed) is
// click-to-place's job (Milestone 4), not this data model's.
export interface InstallationZone {
  key: string;
  acceptsCategory: CategoryKey;
  position: [number, number, number];
  rotation: [number, number, number];
  constraints?: Record<string, unknown>;
}
