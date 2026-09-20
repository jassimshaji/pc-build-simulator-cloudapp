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

// Categories a build can hold only one of. Everything else (RAM, storage, fans,
// GPUs, ...) is limited by the number of zones the case and motherboard offer.
export const SINGLE_SLOT_CATEGORIES: Readonly<Record<string, string>> = {
  CASE: "case",
  MOTHERBOARD: "motherboard",
  CPU: "CPU",
  PSU: "power supply",
};

// Why `component` can't be added to `lines`, or null when it can. The message
// names the part to remove first, since there is no silent "replace".
export function slotLimitViolation(lines: BuildLine[], component: ComponentSummary): string | null {
  const noun = SINGLE_SLOT_CATEGORIES[component.category.key];
  if (!noun) return null;
  const existing = lines.find((line) => line.categoryKey === component.category.key);
  if (!existing) return null;
  return `A build can have only one ${noun}. Remove ${existing.model} before adding another.`;
}

// Adds one unit: bumps the quantity of an existing line, or appends a new one.
// Single-slot categories (see SINGLE_SLOT_CATEGORIES) are left unchanged when
// the slot is already taken.
export function addToLines(lines: BuildLine[], component: ComponentSummary): BuildLine[] {
  if (slotLimitViolation(lines, component)) return lines;
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
