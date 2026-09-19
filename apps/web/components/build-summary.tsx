import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import { summarizeBuild, type SummaryLine } from "@pcbuilder/three-d-engine/src/buildSummary";

const CATEGORY_LABELS: Record<string, string> = {
  CPU: "CPU",
  MOTHERBOARD: "Motherboard",
  RAM: "RAM",
  SSD: "SSD",
  PSU: "Power supply",
  CASE: "Case",
};

// Shared by the editable workspace and the public shared view. `report` is
// null while a check is in flight (or when a shared build has no snapshot).
export function BuildSummary({
  lines,
  report,
}: {
  lines: SummaryLine[];
  report: CompatibilityReport | null;
}) {
  const summary = summarizeBuild(lines, report);
  const { ERROR, WARNING } = summary.issueCounts;

  return (
    <dl className="mt-2 space-y-1.5 text-xs">
      <div className="flex justify-between gap-2">
        <dt className="text-zinc-500">Components</dt>
        <dd className="text-zinc-300">{summary.componentCount}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-zinc-500">Total price</dt>
        <dd className="text-zinc-300">${summary.totalPrice.toFixed(2)}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-zinc-500">Estimated power</dt>
        <dd className="text-zinc-300">
          {report ? `${report.estimatedPowerWatts}W (PSU ≥ ${report.recommendedPsuWattage}W)` : "—"}
        </dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-zinc-500">Compatibility</dt>
        <dd
          className={
            ERROR > 0 ? "text-red-400" : WARNING > 0 ? "text-amber-400" : report ? "text-emerald-400" : "text-zinc-300"
          }
        >
          {report
            ? ERROR > 0 || WARNING > 0
              ? `${ERROR} error(s), ${WARNING} warning(s)`
              : "No problems"
            : "—"}
        </dd>
      </div>
      {summary.componentCount > 0 && summary.missingEssentials.length > 0 && (
        <div>
          <dt className="text-zinc-500">Still missing</dt>
          <dd className="text-zinc-400">
            {summary.missingEssentials.map((key) => CATEGORY_LABELS[key] ?? key).join(", ")}
          </dd>
        </div>
      )}
    </dl>
  );
}
