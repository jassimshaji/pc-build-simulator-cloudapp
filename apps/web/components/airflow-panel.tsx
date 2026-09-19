import { summarizeAirflow, type AirflowPlacement } from "@pcbuilder/three-d-engine/src/airflow";

const PRESSURE_TEXT = {
  NONE: { label: "No fans placed", className: "text-zinc-400", hint: null },
  POSITIVE: {
    label: "Positive pressure",
    className: "text-emerald-400",
    hint: "More air pushed in than pulled out — less dust drawn through gaps.",
  },
  NEGATIVE: {
    label: "Negative pressure",
    className: "text-amber-400",
    hint: "More air pulled out than pushed in — add a front intake fan or flip an exhaust fan to reverse blade.",
  },
  BALANCED: { label: "Balanced", className: "text-emerald-400", hint: "Intake and exhaust roughly match." },
} as const;

// Fan orientation + case pressure summary (Phase 6). Mounts are assigned to the
// front, rear and top in that order; a normal fan intakes at the front and
// exhausts at the rear/top, and a "Reverse Blade" fan flips that — see
// packages/three-d-engine/src/airflow.ts.
export function AirflowPanel({ placements }: { placements: Record<string, AirflowPlacement> }) {
  const airflow = summarizeAirflow(placements);
  const pressure = PRESSURE_TEXT[airflow.pressure];

  return (
    <div className="mt-2 space-y-1.5 text-xs">
      <p className={pressure.className}>
        {pressure.label}
        {airflow.pressure !== "NONE" && (
          <span className="text-zinc-500">
            {" "}
            ({airflow.netCfm > 0 ? "+" : ""}
            {airflow.netCfm} CFM net)
          </span>
        )}
      </p>
      {airflow.fans.length > 0 && (
        <ul className="space-y-0.5 text-zinc-400">
          {airflow.fans.map((fan) => (
            <li key={fan.zoneKey} className="flex justify-between gap-2">
              <span>
                {fan.zoneKey.replace("FAN_MOUNT_", "Fan ")}{" "}
                <span className="text-zinc-600">({fan.face.toLowerCase()})</span>
              </span>
              <span className={fan.flow === "INTAKE" ? "text-sky-400" : "text-orange-400"}>
                {fan.flow === "INTAKE" ? "↓ intake" : "↑ exhaust"} · {fan.cfm} CFM
              </span>
            </li>
          ))}
        </ul>
      )}
      {pressure.hint && <p className="text-zinc-600">{pressure.hint}</p>}
    </div>
  );
}
