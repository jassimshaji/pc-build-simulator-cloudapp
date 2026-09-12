import { prisma } from "@pcbuilder/database";
import { isCategoryKey } from "@pcbuilder/component-models";
import { runCompatibilityCheck, type BuildComponentInput, type CompatibilityReport } from "@pcbuilder/compatibility-engine";

export interface BuildSelection {
  componentId: string;
  quantity: number;
}

// Bridges real Prisma `Component` rows into the compatibility engine's plain
// `BuildComponentInput` shape (ARCHITECTURE.md §6 — the engine itself must
// stay framework/DB-agnostic, so this mapping lives here, not in the
// package). Unknown component ids (deleted between fetch and check) and
// components whose category isn't one of the engine's known categories yet
// (e.g. MONITOR, CASE_LCD — not modeled in compatibility-engine) are silently
// skipped rather than failing the whole check.
export async function checkBuildCompatibility(
  selections: BuildSelection[],
): Promise<CompatibilityReport> {
  const components = await prisma.component.findMany({
    where: { id: { in: selections.map((selection) => selection.componentId) } },
    include: { category: true },
  });
  const componentById = new Map(components.map((component) => [component.id, component]));

  const buildComponents: BuildComponentInput[] = [];
  for (const selection of selections) {
    const component = componentById.get(selection.componentId);
    if (!component || !isCategoryKey(component.category.key)) {
      continue;
    }

    buildComponents.push({
      componentId: component.id,
      categoryKey: component.category.key,
      quantity: selection.quantity,
      hotFields: {
        socket: component.socket ?? undefined,
        formFactor: component.formFactor ?? undefined,
        ramType: component.ramType ?? undefined,
        pcieGeneration: component.pcieGeneration ?? undefined,
        lengthMm: component.lengthMm ?? undefined,
        widthMm: component.widthMm ?? undefined,
        heightMm: component.heightMm ?? undefined,
        tdpWatts: component.tdpWatts ?? undefined,
        powerDrawWatts: component.powerDrawWatts ?? undefined,
        wattage: component.wattage ?? undefined,
      },
      specifications: component.specifications as Record<string, unknown>,
    });
  }

  return runCompatibilityCheck({ components: buildComponents });
}
