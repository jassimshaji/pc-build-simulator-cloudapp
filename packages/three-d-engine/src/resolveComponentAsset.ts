import type { Group as ThreeGroup } from "three";
import { buildGenericModel } from "./placement";

// Mirrors the real ThreeDAsset row's shape as far as this package needs it
// (kind + url) — the app layer passes this straight through from
// `Component.threeDAssets`, no ORM types leaking into this package.
export interface PlacedComponentAsset {
  kind: "GLTF_MODEL" | "PROCEDURAL_FALLBACK" | "PLACEHOLDER";
  url?: string | null;
}

export type AssetResolution =
  | { type: "gltf"; url: string }
  | { type: "procedural"; model: ThreeGroup | null }
  | { type: "placeholder" };

// ARCHITECTURE.md §7.3's asset resolution order:
// 1. A GLTF_MODEL row with a real url -> load the actual file.
// 2. A PROCEDURAL_FALLBACK row -> the named generator (dispatched here by
//    category, same as buildGenericModel always did — the row's own
//    `proceduralGeneratorKey` is admin-facing metadata, not a second
//    dispatch table).
// 3. No ThreeDAsset row at all -> infer a reasonable generator from the
//    category key, i.e. the exact same procedural path as case 2. This is
//    what every component created without visiting the 3D asset manager
//    already gets today, unchanged by this milestone.
// An explicit PLACEHOLDER kind is the one case that renders neither a real
// model nor a generated one — an admin's deliberate "nothing to show yet".
export function resolveComponentAsset(
  categoryKey: string,
  specifications: Record<string, unknown>,
  asset?: PlacedComponentAsset | null,
): AssetResolution {
  if (asset?.kind === "GLTF_MODEL" && asset.url) {
    return { type: "gltf", url: asset.url };
  }
  if (asset?.kind === "PLACEHOLDER") {
    return { type: "placeholder" };
  }
  return { type: "procedural", model: buildGenericModel(categoryKey, specifications) };
}
