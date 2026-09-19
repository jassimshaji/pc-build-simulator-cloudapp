import type { PlacedComponent } from "@pcbuilder/three-d-engine";
import type { BuildLine, ComponentSummary } from "@/types/workspace";

// Pure operations on the in-progress build (its lines and its zone
// placements), used by the useBuildDraft hook. Kept free of React so they can
// be unit-tested directly.

export function lineFromComponent(component: ComponentSummary): BuildLine {
  return {
    componentId: component.id,
    categoryKey: component.category.key,
    categoryLabel: component.category.label,
    model: component.model,
    quantity: 1,
    price: Number(component.price),
    specifications: component.specifications,
    asset: component.threeDAssets[0],
  };
}

// Adds one unit: bumps the quantity of an existing line, or appends a new one.
// Deliberately doesn't enforce "one CPU per build" or similar slot uniqueness
// — the compatibility rules already tolerate multiples.
export function addToLines(lines: BuildLine[], component: ComponentSummary): BuildLine[] {
  const exists = lines.some((line) => line.componentId === component.id);
  return exists
    ? lines.map((line) =>
        line.componentId === component.id ? { ...line, quantity: line.quantity + 1 } : line,
      )
    : [...lines, lineFromComponent(component)];
}

export function removeFromLines(lines: BuildLine[], componentId: string): BuildLine[] {
  return lines.filter((line) => line.componentId !== componentId);
}

export function placementFromComponent(component: ComponentSummary): PlacedComponent {
  return {
    componentId: component.id,
    categoryKey: component.category.key,
    specifications: component.specifications,
    asset: component.threeDAssets[0],
  };
}

// Removing a component from the build also frees every zone it occupied.
export function removePlacementsOf(
  placements: Record<string, PlacedComponent>,
  componentId: string,
): Record<string, PlacedComponent> {
  return Object.fromEntries(
    Object.entries(placements).filter(([, placed]) => placed.componentId !== componentId),
  );
}

// The case is the root container (rendered as soon as it's added, not
// click-placed into a zone), so it always counts as placed.
export function isLinePlaced(line: BuildLine, placements: Record<string, PlacedComponent>): boolean {
  return (
    line.categoryKey === "CASE" ||
    Object.values(placements).some((placed) => placed.componentId === line.componentId)
  );
}
