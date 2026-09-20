import { summarizeAirflow } from "@pcbuilder/three-d-engine/src/airflow";
import {
  estimateNoise,
  estimatePerformance,
  estimateThermals,
  type EstimateLine,
  type ThermalRating,
} from "@pcbuilder/three-d-engine/src/estimates";

const RATING_CLASS: Record<ThermalRating, string> = {
  Cool: "text-emerald-400",
  Warm: "text-amber-400",
  Hot: "text-red-400",
};

const NOISE_CLASS = {
  Silent: "text-emerald-400",
  Quiet: "text-emerald-400",
  Moderate: "text-amber-400",
  Loud: "text-red-400",
} as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-300">{children}</dd>
    </div>
  );
}

// Rough, rule-based thermal / noise / performance estimates (Phase 6 backlog).
// Everything here is a heuristic from component specs — see
// packages/three-d-engine/src/estimates.ts — and is labelled as such.
export function EstimatesPanel({
  lines,
  placements,
}: {
  lines: EstimateLine[];
  placements: Record<string, EstimateLine>;
}) {
  if (lines.length === 0) {
    return <p className="text-xs text-zinc-600">Add components to see estimates.</p>;
  }

  const airflow = summarizeAirflow(placements);
  const thermals = estimateThermals(lines, airflow);
  const noise = estimateNoise(placements);
  const performance = estimatePerformance(lines);

  return (
    <div className="mt-2 space-y-2 text-xs">
      <dl className="space-y-1.5">
        <Row label="Case air (load)">~{thermals.caseAirC}°C</Row>
        <Row label="CPU temp (load)">
          {thermals.cpu ? (
            <span className={RATING_CLASS[thermals.cpu.rating]}>
              ~{thermals.cpu.tempC}°C · {thermals.cpu.rating}
              <span className="text-zinc-600"> ({thermals.cpuCooler})</span>
            </span>
          ) : (
            "—"
          )}
        </Row>
        <Row label="GPU temp (load)">
          {thermals.gpu ? (
            <span className={RATING_CLASS[thermals.gpu.rating]}>
              ~{thermals.gpu.tempC}°C · {thermals.gpu.rating}
            </span>
          ) : (
            "—"
          )}
        </Row>
        <Row label="Case fan noise">
          {noise.db !== null && noise.label ? (
            <span className={NOISE_CLASS[noise.label]}>
              ~{noise.db} dBA · {noise.label}
            </span>
          ) : (
            "no case fans"
          )}
        </Row>
        <Row label="Performance">
          {performance ? (
            <span>
              {performance.tier} · {performance.score}/100
              {performance.bottleneck && (
                <span className="text-amber-400"> ({performance.bottleneck}-limited)</span>
              )}
            </span>
          ) : (
            "needs CPU + GPU"
          )}
        </Row>
      </dl>
      <p className="text-zinc-600">
        Rough estimates from component specs, not benchmarks. Performance is a relative score, not
        an FPS figure.
      </p>
    </div>
  );
}
