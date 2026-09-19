// Rule-based thermal / performance / noise estimates (Phase 6 backlog).
//
// These are deliberately simple, documented heuristics computed from component
// specs — NOT simulations and NOT benchmarks. They exist to give a build a
// rough, comparable "feel" (is it hot? loud? fast?), and every number is
// surfaced in the UI as an estimate. Pure and framework-agnostic like the rest
// of this package, so they're unit-testable and can be swapped for a real model
// later without touching callers.

import type { AirflowPlacement, AirflowSummary } from "./airflow";
import { fanMountFaceForZone } from "./airflow";

export interface EstimateLine {
  categoryKey: string;
  specifications: Record<string, unknown>;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function firstOf(lines: EstimateLine[], categoryKey: string): Record<string, unknown> | undefined {
  return lines.find((line) => line.categoryKey === categoryKey)?.specifications;
}

// ---------------------------------------------------------------- noise ----

export type NoiseLabel = "Silent" | "Quiet" | "Moderate" | "Loud";

export interface NoiseEstimate {
  db: number | null; // null when there are no case fans to estimate from
  label: NoiseLabel | null;
  fanCount: number;
}

// Larger fans move the same air at lower RPM, so they're quieter; used only
// when a fan spec doesn't list its own noise level.
export function estimateFanDba(sizeMm: unknown): number {
  const size = num(sizeMm) ?? 120;
  if (size >= 200) return 20;
  if (size >= 140) return 23;
  if (size >= 120) return 25;
  return 28;
}

export function noiseLabel(db: number): NoiseLabel {
  if (db < 25) return "Silent";
  if (db < 35) return "Quiet";
  if (db < 45) return "Moderate";
  return "Loud";
}

// Sound levels add on a log scale: L = 10*log10(sum(10^(Li/10))). Two equal
// fans are ~3 dB louder than one, not twice as loud. Only case fans placed in
// a fan mount count — GPU/CPU cooler fans have no noise figure in the specs.
export function estimateNoise(placements: Record<string, AirflowPlacement>): NoiseEstimate {
  const levels = Object.entries(placements)
    .filter(([zoneKey, placed]) => fanMountFaceForZone(zoneKey) && placed.categoryKey === "FAN")
    .map(([, placed]) => num(placed.specifications.noiseLevelDba) ?? estimateFanDba(placed.specifications.sizeMm));

  if (levels.length === 0) return { db: null, label: null, fanCount: 0 };
  const db = 10 * Math.log10(levels.reduce((sum, level) => sum + 10 ** (level / 10), 0));
  const rounded = Math.round(db * 10) / 10;
  return { db: rounded, label: noiseLabel(rounded), fanCount: levels.length };
}

// -------------------------------------------------------------- thermal ----

export type ThermalRating = "Cool" | "Warm" | "Hot";

export interface ComponentThermal {
  tempC: number;
  rating: ThermalRating;
}

export interface ThermalEstimate {
  cpu: ComponentThermal | null;
  gpu: ComponentThermal | null;
  cpuCooler: string; // description of what's cooling the CPU, for display
}

const AMBIENT_C = 25;
// Assumed rated capacity (W) of common AIO radiator sizes; air coolers list
// their own tdpRatingWatts.
const AIO_CAPACITY_WATTS: Record<number, number> = { 120: 150, 240: 250, 280: 280, 360: 350, 420: 400 };
const STOCK_COOLER_WATTS = 65;
const GPU_REFERENCE_WATTS = 350; // a GPU's own cooler is sized for roughly this

export function thermalRating(tempC: number): ThermalRating {
  if (tempC < 70) return "Cool";
  if (tempC < 85) return "Warm";
  return "Hot";
}

// How well the case moves air, as a multiplier on the temperature rise:
// no fans is worst, intake+exhaust is normal, plenty of airflow is best.
export function airflowFactor(airflow: Pick<AirflowSummary, "intakeCfm" | "exhaustCfm">): number {
  const { intakeCfm, exhaustCfm } = airflow;
  if (intakeCfm === 0 && exhaustCfm === 0) return 1.2;
  if (intakeCfm === 0 || exhaustCfm === 0) return 1.1;
  return intakeCfm + exhaustCfm >= 150 ? 0.9 : 1.0;
}

function coolerCapacity(lines: EstimateLine[]): { watts: number; description: string } {
  const aio = firstOf(lines, "AIO_COOLER");
  const aioSize = num(aio?.radiatorSizeMm);
  if (aio && aioSize) {
    return { watts: AIO_CAPACITY_WATTS[aioSize] ?? 250, description: `${aioSize}mm AIO` };
  }
  const air = firstOf(lines, "AIR_COOLER");
  const airWatts = num(air?.tdpRatingWatts);
  if (air && airWatts) return { watts: airWatts, description: "air cooler" };
  return { watts: STOCK_COOLER_WATTS, description: "stock cooler (none selected)" };
}

// Load temperature ≈ ambient + (heat / cooling capacity) * 60°C * airflow
// factor. A CPU whose TDP equals its cooler's rating lands around 85°C in a
// normal case — "Warm/Hot" territory, which matches how coolers are rated.
export function estimateThermals(lines: EstimateLine[], airflow: AirflowSummary): ThermalEstimate {
  const factor = airflowFactor(airflow);
  const cooler = coolerCapacity(lines);

  const cpuTdp = num(firstOf(lines, "CPU")?.tdpWatts);
  const cpu = cpuTdp
    ? toThermal(AMBIENT_C + (cpuTdp / cooler.watts) * 60 * factor)
    : null;

  const gpuWatts = num(firstOf(lines, "GPU")?.powerDrawWatts);
  const gpu = gpuWatts ? toThermal(AMBIENT_C + (gpuWatts / GPU_REFERENCE_WATTS) * 55 * factor) : null;

  return { cpu, gpu, cpuCooler: cooler.description };
}

function toThermal(rawC: number): ComponentThermal {
  const tempC = Math.round(Math.min(105, Math.max(30, rawC)));
  return { tempC, rating: thermalRating(tempC) };
}

// ---------------------------------------------------------- performance ----

export type PerformanceTier = "Entry" | "Mainstream" | "High-end" | "Enthusiast";
export type Bottleneck = "CPU" | "GPU" | null;

export interface PerformanceEstimate {
  score: number; // 0-100, relative — NOT an FPS figure
  tier: PerformanceTier;
  cpuScore: number | null;
  gpuScore: number | null;
  bottleneck: Bottleneck;
}

// Reference points that map to a score of 100 (roughly a current flagship).
const GPU_REFERENCE_INDEX = 12.9;
const CPU_REFERENCE_INDEX = 21;

// Gaming-oriented indices. Games rarely use more than ~8 cores, so extra cores
// help only a little; big cache (e.g. 3D V-Cache) helps a lot.
export function cpuIndex(spec: Record<string, unknown>): number | null {
  const boost = num(spec.boostClockGhz);
  const cores = num(spec.coreCount);
  if (!boost || !cores) return null;
  const cache = num(spec.cacheMb) ?? 0;
  return boost * Math.sqrt(Math.min(cores, 8)) * (1 + cache / 200);
}

// Clock x sqrt(memory bus width) x a mild VRAM bonus.
export function gpuIndex(spec: Record<string, unknown>): number | null {
  const boost = num(spec.boostClockMhz) ?? num(spec.coreClockMhz);
  const bus = num(spec.memoryBusBit);
  if (!boost || !bus) return null;
  const vram = num(spec.vramCapacityGb) ?? 8;
  return (boost / 1000) * Math.sqrt(bus / 64) * (1 + vram / 24);
}

export function performanceTier(score: number): PerformanceTier {
  if (score < 25) return "Entry";
  if (score < 50) return "Mainstream";
  if (score < 75) return "High-end";
  return "Enthusiast";
}

const clamp100 = (value: number) => Math.min(100, Math.max(0, value));

// Returns null when there's no GPU (or no usable CPU/GPU numbers): without a
// GPU there's nothing to say about gaming performance.
export function estimatePerformance(lines: EstimateLine[]): PerformanceEstimate | null {
  const cpuSpec = firstOf(lines, "CPU");
  const gpuSpec = firstOf(lines, "GPU");
  const cpuRaw = cpuSpec ? cpuIndex(cpuSpec) : null;
  const gpuRaw = gpuSpec ? gpuIndex(gpuSpec) : null;
  if (gpuRaw === null || cpuRaw === null) return null;

  const cpuScore = Math.round(clamp100((cpuRaw / CPU_REFERENCE_INDEX) * 100));
  const gpuScore = Math.round(clamp100((gpuRaw / GPU_REFERENCE_INDEX) * 100));
  // Games lean on the GPU more than the CPU.
  const score = Math.round(0.65 * gpuScore + 0.35 * cpuScore);

  let bottleneck: Bottleneck = null;
  if (cpuScore < gpuScore * 0.5) bottleneck = "CPU";
  else if (gpuScore < cpuScore * 0.5) bottleneck = "GPU";

  return { score, tier: performanceTier(score), cpuScore, gpuScore, bottleneck };
}
