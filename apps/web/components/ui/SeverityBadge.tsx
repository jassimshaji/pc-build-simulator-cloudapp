export type Severity = "INFO" | "WARNING" | "ERROR";

const STYLES: Record<Severity, string> = {
  ERROR: "bg-red-950 text-red-400",
  WARNING: "bg-amber-950 text-amber-400",
  INFO: "bg-emerald-950 text-emerald-400",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}
