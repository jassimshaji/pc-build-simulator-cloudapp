import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import type { PlacedComponent } from "@pcbuilder/three-d-engine";
import { AirflowPanel } from "@/components/airflow-panel";
import { BuildSummary } from "@/components/build-summary";
import { EstimatesPanel } from "@/components/estimates-panel";
import { Section } from "@/components/ui/Section";
import { BuildList } from "@/components/workspace/BuildList";
import { CompatibilityPanel } from "@/components/workspace/CompatibilityPanel";
import { ComponentDetails } from "@/components/workspace/ComponentDetails";
import type { BuildLine, ComponentSummary } from "@/types/workspace";

// Right panel: everything about the selected component and the build so far.
// Each section is its own component; this just stacks them.
export function BuildSidebar({
  selected,
  hasCase,
  onAdd,
  lines,
  placements,
  onRemove,
  report,
  isChecking,
}: {
  selected: ComponentSummary | null;
  hasCase: boolean;
  onAdd: (component: ComponentSummary) => void;
  lines: BuildLine[];
  placements: Record<string, PlacedComponent>;
  onRemove: (componentId: string) => void;
  report: CompatibilityReport | null;
  isChecking: boolean;
}) {
  return (
    <aside className="flex shrink-0 flex-col gap-4 bg-zinc-900/40 p-4 text-sm lg:w-80 lg:overflow-y-auto">
      <ComponentDetails selected={selected} hasCase={hasCase} onAdd={onAdd} />
      <BuildList lines={lines} placements={placements} onRemove={onRemove} />
      <Section title="Build summary">
        <BuildSummary lines={lines} report={report} />
      </Section>
      <Section title="Airflow">
        <AirflowPanel placements={placements} />
      </Section>
      <Section title="Estimates">
        <EstimatesPanel lines={lines} placements={placements} />
      </Section>
      <CompatibilityPanel lineCount={lines.length} report={report} isChecking={isChecking} />
    </aside>
  );
}
