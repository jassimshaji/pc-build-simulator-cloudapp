"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import type { InitialBuild } from "@/app/workspace/build-workspace";
import { AirflowPanel } from "@/components/airflow-panel";
import { BuildSummary } from "@/components/build-summary";
import { EstimatesPanel } from "@/components/estimates-panel";

const WorkspaceCanvas = dynamic(
  () => import("@pcbuilder/three-d-engine").then((mod) => mod.WorkspaceCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-600">
        Loading 3D scene...
      </div>
    ),
  },
);

// Read-only counterpart of BuildWorkspace: same 3D scene, but with no picker,
// no zone highlighting/click handler, and no save/share controls. The
// compatibility report is the snapshot stored when the owner last saved.
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
          <WorkspaceCanvas
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
        <div>
          <h2 className="font-medium text-zinc-200">Components</h2>
          {build.buildLines.length === 0 ? (
            <p className="text-zinc-600">This build is empty.</p>
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
        </div>

        <div>
          <h2 className="font-medium text-zinc-200">Build summary</h2>
          <BuildSummary lines={build.buildLines} report={report} />
        </div>

        <div>
          <h2 className="font-medium text-zinc-200">Airflow</h2>
          <AirflowPanel placements={build.placements} />
        </div>

        <div>
          <h2 className="font-medium text-zinc-200">Estimates</h2>
          <EstimatesPanel lines={build.buildLines} placements={build.placements} />
        </div>

        <div>
          <h2 className="font-medium text-zinc-200">Compatibility</h2>
          {report ? (
            <>
              <ul className="mt-2 space-y-1.5 text-xs">
                {report.results.map((result, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        result.severity === "ERROR"
                          ? "bg-red-950 text-red-400"
                          : result.severity === "WARNING"
                            ? "bg-amber-950 text-amber-400"
                            : "bg-emerald-950 text-emerald-400"
                      }`}
                    >
                      {result.severity}
                    </span>
                    <span className="text-zinc-400">{result.message}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-zinc-600">No compatibility data saved.</p>
          )}
        </div>

        <Link href="/workspace" className="text-xs text-zinc-400 hover:text-zinc-100">
          Start your own build →
        </Link>
      </aside>
    </div>
  );
}
