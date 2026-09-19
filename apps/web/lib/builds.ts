import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { deserializeBuild } from "@pcbuilder/three-d-engine/src/buildSerialization";
import { cameraFromWorkspaceState } from "@pcbuilder/three-d-engine/src/cameraState";
import { checkBuildCompatibility } from "@/lib/compatibility";
import type { BuildLine, InitialBuild } from "@/types/workspace";

export const buildRowSchema = z.object({
  componentId: z.string().min(1),
  installedZoneKey: z.string().min(1),
});

export type BuildRowInput = z.infer<typeof buildRowSchema>;

// `workspaceState` arrives from the client as arbitrary JSON. Only the camera
// is understood today, so store exactly that (validated) and drop anything
// else. Returns undefined when there's nothing valid to store, so callers
// leave the column untouched.
export function sanitizeWorkspaceState(input: unknown): Prisma.InputJsonValue | undefined {
  const camera = cameraFromWorkspaceState(input);
  // Spread into plain arrays: CameraState is an interface, which Prisma's
  // JSON input type doesn't accept as-is.
  return camera ? { camera: { position: [...camera.position], target: [...camera.target] } } : undefined;
}

// Snapshots the compatibility report onto the build row so list/summary views
// don't need to recompute it (PCBuild.compatibilityStatus / estimatedPowerWatts).
export async function computeBuildSnapshot(rows: BuildRowInput[]) {
  const { lines } = deserializeBuild(rows);
  const report = await checkBuildCompatibility(lines);
  return {
    compatibilityStatus: report as unknown as Prisma.InputJsonValue,
    estimatedPowerWatts: report.estimatedPowerWatts,
  };
}

export const workspaceBuildInclude = {
  components: {
    include: { component: { include: { category: true, threeDAssets: true } } },
  },
} satisfies Prisma.PCBuildInclude;

export type SavedBuildWithComponents = Prisma.PCBuildGetPayload<{
  include: typeof workspaceBuildInclude;
}>;

// Maps a saved build's flat rows back to the workspace's in-memory shape
// (build lines + zone placements), used by both the owner's editable
// workspace and the public read-only shared view.
export function toInitialBuild(saved: SavedBuildWithComponents): InitialBuild {
  const componentById = new Map(saved.components.map((row) => [row.componentId, row.component]));
  const { lines, placements } = deserializeBuild(saved.components);

  const buildLines: BuildLine[] = lines.flatMap((line) => {
    const component = componentById.get(line.componentId);
    if (!component) return [];
    const asset = component.threeDAssets[0];
    return [
      {
        componentId: component.id,
        categoryKey: component.category.key,
        categoryLabel: component.category.label,
        model: component.model,
        quantity: line.quantity,
        price: Number(component.price),
        specifications: component.specifications as Record<string, unknown>,
        asset: asset ? { kind: asset.kind, url: asset.url } : undefined,
      },
    ];
  });

  const placedComponents = Object.fromEntries(
    Object.entries(placements).flatMap(([zoneKey, componentId]) => {
      const line = buildLines.find((candidate) => candidate.componentId === componentId);
      return line
        ? [
            [
              zoneKey,
              {
                componentId,
                categoryKey: line.categoryKey,
                specifications: line.specifications,
                asset: line.asset,
              },
            ],
          ]
        : [];
    }),
  );

  return {
    id: saved.id,
    name: saved.name,
    buildLines,
    placements: placedComponents,
    camera: cameraFromWorkspaceState(saved.workspaceState),
  };
}

// Builds are private to their owner until sharing lands (Phase 5, Milestone 2),
// so a build owned by someone else is reported as not found, not forbidden.
export function findOwnedBuild(id: string, userId: string) {
  return prisma.pCBuild.findFirst({ where: { id, userId } });
}
