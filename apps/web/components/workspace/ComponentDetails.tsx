import { Button } from "@/components/ui/Button";
import { Hint, Section } from "@/components/ui/Section";
import type { ComponentSummary } from "@/types/workspace";

// Renders a `specifications` value for display. Arrays join with commas;
// nested objects (e.g. a motherboard's `dimensionsMm: { width, depth }`)
// render as "key: value" pairs rather than the useless "[object Object]"
// that `String()` would otherwise produce.
function formatSpecValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => `${key}: ${nested}`)
      .join(", ");
  }
  return String(value);
}

// The selected component's specs and its "Add to build" action.
export function ComponentDetails({
  selected,
  hasCase,
  onAdd,
}: {
  selected: ComponentSummary | null;
  hasCase: boolean;
  onAdd: (component: ComponentSummary) => void;
}) {
  return (
    <Section title="Component details">
      {selected ? (
        <div className="mt-2 space-y-2">
          <p className="text-zinc-300">
            {selected.model} <span className="text-zinc-600">({selected.brand.name})</span>
          </p>
          <p className="text-zinc-500">${Number(selected.price).toFixed(2)}</p>
          <ul className="space-y-0.5 text-xs text-zinc-500">
            {Object.entries(selected.specifications).map(([key, value]) => (
              <li key={key}>
                <span className="text-zinc-600">{key}:</span> {formatSpecValue(value)}
              </li>
            ))}
          </ul>
          <Button variant="primary" size="md" onClick={() => onAdd(selected)}>
            Add to build
          </Button>
          {selected.category.key === "CASE" ? (
            <Hint>Adds it and shows it in the 3D view immediately.</Hint>
          ) : hasCase ? (
            <Hint>
              Placed in the first free slot automatically — or click a highlighted zone in the 3D
              view to choose one.
              {selected.category.key !== "MOTHERBOARD" &&
                " (RAM, GPU and storage slots appear once a motherboard is placed.)"}
            </Hint>
          ) : (
            <Hint>Add a case first to enable 3D placement.</Hint>
          )}
        </div>
      ) : (
        <Hint>Select a component to see its specifications.</Hint>
      )}
    </Section>
  );
}
