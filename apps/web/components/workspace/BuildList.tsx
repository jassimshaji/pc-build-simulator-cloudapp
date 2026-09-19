import type { PlacedComponent } from "@pcbuilder/three-d-engine";
import { Hint, Section } from "@/components/ui/Section";
import { isLinePlaced } from "@/lib/buildDraft";
import type { BuildLine } from "@/types/workspace";

// "Your build": each line with its quantity, a placed marker and a remove button.
export function BuildList({
  lines,
  placements,
  onRemove,
}: {
  lines: BuildLine[];
  placements: Record<string, PlacedComponent>;
  onRemove: (componentId: string) => void;
}) {
  return (
    <Section title="Your build">
      {lines.length === 0 ? (
        <Hint>No components added yet.</Hint>
      ) : (
        <ul className="mt-2 space-y-1 text-xs">
          {lines.map((line) => (
            <li key={line.componentId} className="flex items-center justify-between gap-2">
              <span className="text-zinc-300">
                {line.model}{" "}
                <span className="text-zinc-600">
                  ({line.categoryLabel}
                  {line.quantity > 1 ? ` ×${line.quantity}` : ""})
                </span>
                {isLinePlaced(line, placements) && <span className="ml-1 text-emerald-500">● placed</span>}
              </span>
              <button
                type="button"
                onClick={() => onRemove(line.componentId)}
                className="text-zinc-500 hover:text-red-400"
                aria-label={`Remove ${line.model}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
