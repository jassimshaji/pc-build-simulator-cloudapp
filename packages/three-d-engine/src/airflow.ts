// Pure fan-orientation / case-pressure model (Phase 6). Framework-agnostic and
// free of three.js so it's Vitest-testable and usable from server or client.
//
// Deliberately simple: this is a directional *summary* (which fans push air
// in vs. out, and the net imbalance), not a thermal or CFD simulation.

import { fanMountFace, type FanMountFace } from "./zones/generateCaseZones";

export type FanFlow = "INTAKE" | "EXHAUST";
export type CasePressure = "NONE" | "POSITIVE" | "NEGATIVE" | "BALANCED";

export function isFanMountZone(zoneKey: string): boolean {
  return zoneKey.startsWith("FAN_MOUNT_");
}

// Which face of the case a FAN_MOUNT_<n> zone is on - derived from the same
// rule generateCaseZones uses to place it (FAN_MOUNT_1 is index 0), so the
// zone layout and the airflow model can't drift apart.
export function fanMountFaceForZone(zoneKey: string): FanMountFace | null {
  const match = /^FAN_MOUNT_(\d+)$/.exec(zoneKey);
  return match ? fanMountFace(Number(match[1]) - 1) : null;
}

// A normal ("Forward Blade") fan pulls air in through the front and pushes it
// out through the rear and top; a "Reverse Blade" fan flips that.
export function fanFlowDirection(bladeDirection: unknown, face: FanMountFace): FanFlow {
  const normal: FanFlow = face === "FRONT" ? "INTAKE" : "EXHAUST";
  if (bladeDirection !== "Reverse Blade") return normal;
  return normal === "INTAKE" ? "EXHAUST" : "INTAKE";
}

// When a fan spec has no measured airflow, estimate it from size: airflow
// scales with swept area, anchored at ~50 CFM for a 120mm fan.
export function estimateCfm(sizeMm: unknown): number {
  const size = typeof sizeMm === "number" && sizeMm > 0 ? sizeMm : 120;
  return Math.round(50 * (size / 120) ** 2);
}

// Where a streaming particle is along its travel, as a 0..1 fraction. Particles
// are evenly staggered by index and loop; speed is in full loops per second.
export function streamProgress(timeSeconds: number, index: number, count: number, loopsPerSecond: number): number {
  const p = (timeSeconds * loopsPerSecond + index / Math.max(count, 1)) % 1;
  return p < 0 ? p + 1 : p;
}

// Fan-airflow animation speed: stronger fans stream faster, clamped so a very
// weak or very strong fan stays readable.
export function streamLoopsPerSecond(cfm: number): number {
  return Math.min(1.2, Math.max(0.3, cfm / 80));
}

export interface AirflowPlacement {
  categoryKey: string;
  specifications: Record<string, unknown>;
}

export interface AirflowFan {
  zoneKey: string;
  face: FanMountFace;
  flow: FanFlow;
  cfm: number;
}

export interface AirflowSummary {
  fans: AirflowFan[];
  intakeCfm: number;
  exhaustCfm: number;
  netCfm: number; // intake - exhaust; > 0 means positive pressure
  pressure: CasePressure;
}

// Within this fraction of total airflow, intake and exhaust count as balanced.
const BALANCE_TOLERANCE = 0.1;

export function summarizeAirflow(placements: Record<string, AirflowPlacement>): AirflowSummary {
  const fans: AirflowFan[] = Object.entries(placements)
    .flatMap(([zoneKey, placed]) => {
      const face = fanMountFaceForZone(zoneKey);
      if (!face || placed.categoryKey !== "FAN") return [];
      const spec = placed.specifications;
      return [
        {
          zoneKey,
          face,
          flow: fanFlowDirection(spec.bladeDirection, face),
          cfm: typeof spec.airflowCfm === "number" && spec.airflowCfm > 0 ? spec.airflowCfm : estimateCfm(spec.sizeMm),
        },
      ];
    })
    .sort((a, b) => a.zoneKey.localeCompare(b.zoneKey, undefined, { numeric: true }));

  const intakeCfm = fans.filter((fan) => fan.flow === "INTAKE").reduce((sum, fan) => sum + fan.cfm, 0);
  const exhaustCfm = fans.filter((fan) => fan.flow === "EXHAUST").reduce((sum, fan) => sum + fan.cfm, 0);
  const netCfm = intakeCfm - exhaustCfm;
  const total = intakeCfm + exhaustCfm;

  let pressure: CasePressure;
  if (total === 0) pressure = "NONE";
  else if (Math.abs(netCfm) <= total * BALANCE_TOLERANCE) pressure = "BALANCED";
  else pressure = netCfm > 0 ? "POSITIVE" : "NEGATIVE";

  return { fans, intakeCfm, exhaustCfm, netCfm, pressure };
}
