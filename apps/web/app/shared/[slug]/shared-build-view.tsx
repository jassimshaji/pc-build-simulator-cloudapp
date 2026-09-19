"use client";

import Link from "next/link";
import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import { AirflowPanel } from "@/components/airflow-panel";
import { BuildSummary } from "@/components/build-summary";
import { CompatibilityResults } from "@/components/compatibility-results";
import { EstimatesPanel } from "@/components/estimates-panel";
import { SceneCanvas } from "@/components/scene-canvas";
import { Hint, Section } from "@/components/ui/Section";
import type { InitialBuild } from "@/types/workspace";

// Read-only counterpart of BuildWorkspace: same 3D scene and the same side
// panels, but no picker, no zone highlighting/click handler, and no save/share
// controls. The compatibility report is the snapshot stored when the owner last
// saved.
export function SharedBuildView({
  build,
  report,
}: {
  build: InitialBuild;
  report: CompatibilityReport | null;
}) {
  const caseLine = build.buildLines.find((line) => line.categoryKey === "CASE");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:h-[calc(100dvh-3.5rem)] lg:flex-none lg:flex-row lg:overflow-hidden">
      <main className="flex min-h-[20rem] flex-1 flex-col gap-2 p-3 lg:min-h-0">
        <h1 className="text-lg font-semibold text-zinc-100">{build.name}</h1>
        <div className="min-h-0 flex-1 overflow-hidden rounded border border-zinc-800">
          <SceneCanvas
            caseComponent={
              caseLine
                ? {
                    componentId: caseLine.componentId,
                    categoryKey: "CASE",
                    specifications: caseLine.specifications,
                    asset: caseLine.asset,
                  }
                : null
            }
            placements={build.placements}
            showAirflow
            initialCamera={build.camera}
          />
        </div>
        <p className="text-xs text-zinc-500">Drag to orbit · Scroll to zoom · Right-click drag to pan</p>
      </main>

      <aside className="flex shrink-0 flex-col gap-4 border-t border-zinc-800 bg-zinc-900/40 p-4 text-sm lg:w-80 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <Section title="Components">
          {build.buildLines.length === 0 ? (
            <Hint>This build is empty.</Hint>
          ) : (
            <ul className="mt-2 space-y-1 text-xs">
              {build.buildLines.map((line) => (
                <li key={line.componentId} className="text-zinc-300">
                  {line.model}{" "}
                  <span className="text-zinc-600">
                    ({line.categoryLabel}
                    {line.quantity > 1 ? ` ×${line.quantity}` : ""})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Build summary">
          <BuildSummary lines={build.buildLines} report={report} />
        </Section>

        <Section title="Airflow">
          <AirflowPanel placements={build.placements} />
        </Section>

        <Section title="Estimates">
          <EstimatesPanel lines={build.buildLines} placements={build.placements} />
        </Section>

        <Section title="Compatibility">
          {report ? <CompatibilityResults report={report} /> : <Hint>No compatibility data saved.</Hint>}
        </Section>

        <Link href="/workspace" className="text-xs text-zinc-400 hover:text-zinc-100">
          Start your own build →
        </Link>
      </aside>
    </div>
  );
}
