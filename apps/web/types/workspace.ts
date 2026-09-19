import type { CameraState, PlacedComponent } from "@pcbuilder/three-d-engine";

// Shapes shared by the workspace, the public shared view and lib/builds.ts.

export interface Category {
  id: string;
  key: string;
  label: string;
}

export interface ThreeDAssetSummary {
  kind: "GLTF_MODEL" | "PROCEDURAL_FALLBACK" | "PLACEHOLDER";
  url: string | null;
}

// A component as returned by GET /api/components (only the fields the UI uses).
export interface ComponentSummary {
  id: string;
  model: string;
  price: string;
  specifications: Record<string, unknown>;
  category: { key: string; label: string };
  brand: { name: string };
  threeDAssets: ThreeDAssetSummary[];
}

// One line of the in-progress build: a component and how many of it.
export interface BuildLine {
  componentId: string;
  categoryKey: string;
  categoryLabel: string;
  model: string;
  quantity: number;
  price: number; // unit price
  specifications: Record<string, unknown>;
  // The schema allows several ThreeDAsset rows per component, but the admin
  // 3D asset manager only ever manages one "slot" (see its own route
  // comment) — the first row is that slot. No row at all just means nobody
  // has assigned one yet, which resolveComponentAsset already treats as
  // "use the procedural fallback".
  asset?: ThreeDAssetSummary;
}

// A saved build, mapped back into the workspace's shape (see lib/builds.ts).
export interface InitialBuild {
  id: string;
  name: string;
  buildLines: BuildLine[];
  placements: Record<string, PlacedComponent>;
  shareSlug?: string | null;
  camera?: CameraState | null;
}
