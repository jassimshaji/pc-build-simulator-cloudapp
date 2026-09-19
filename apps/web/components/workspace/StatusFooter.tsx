import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import { summarizeBuild } from "@pcbuilder/three-d-engine/src/buildSummary";
import type { BuildLine } from "@/types/workspace";

// One-line summary bar along the bottom of the workspace.
export function StatusFooter({
  lines,
  report,
}: {
  lines: BuildLine[];
  report: CompatibilityReport | null;
}) {
  const summary = summarizeBuild(lines, report);

  return (
    <footer className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 border-t border-zinc-800 bg-zinc-900/40 px-4 py-2 text-xs text-zinc-500">
      <span>
        Build summary:{" "}
        {lines.length === 0
          ? "no components yet"
          : `${summary.componentCount} component(s), $${summary.totalPrice.toFixed(2)}`}
      </span>
      <span>
        Estimated power:{" "}
        {report ? `${report.estimatedPowerWatts}W (recommend ${report.recommendedPsuWattage}W PSU)` : "—"}
      </span>
      <span>Compatibility: {report ? report.overallStatus : "—"}</span>
    </footer>
  );
}
