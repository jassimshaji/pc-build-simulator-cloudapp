import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

// The list of compatibility results, shared by the editable workspace and the
// public shared view.
export function CompatibilityResults({
  report,
  emptyText = "No issues detected yet.",
}: {
  report: CompatibilityReport;
  emptyText?: string;
}) {
  if (report.results.length === 0) {
    return <p className="mt-2 text-xs text-zinc-600">{emptyText}</p>;
  }

  return (
    <ul className="mt-2 space-y-1.5 text-xs">
      {report.results.map((result, index) => (
        <li key={index} className="flex items-start gap-2">
          <SeverityBadge severity={result.severity} />
          <span className="text-zinc-400">{result.message}</span>
        </li>
      ))}
    </ul>
  );
}
