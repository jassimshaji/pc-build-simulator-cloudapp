import { describe, expect, it } from "vitest";
import { summarizeAirflow } from "../src/airflow";
import {
  airflowFactor,
  cpuIndex,
  estimateFanDba,
  estimateNoise,
  estimatePerformance,
  estimateThermals,
  gpuIndex,
  noiseLabel,
  performanceTier,
  thermalRating,
} from "../src/estimates";

const line = (categoryKey: string, specifications: Record<string, unknown>) => ({ categoryKey, specifications });
const fan = (spec: Record<string, unknown>) => ({ categoryKey: "FAN", specifications: spec });

const cpu7800x3d = line("CPU", { boostClockGhz: 5.0, coreCount: 8, cacheMb: 96, tdpWatts: 120 });
const cpu13600k = line("CPU", { boostClockGhz: 5.1, coreCount: 14, cacheMb: 24, tdpWatts: 125 });
const gpu4070 = line("GPU", { boostClockMhz: 2475, memoryBusBit: 192, vramCapacityGb: 12, powerDrawWatts: 200 });
const gpu4090 = line("GPU", { boostClockMhz: 2640, memoryBusBit: 384, vramCapacityGb: 24, powerDrawWatts: 450 });

describe("noise", () => {
  it("returns no estimate without case fans", () => {
    expect(estimateNoise({})).toEqual({ db: null, label: null, fanCount: 0 });
  });

  it("uses a fan's own noise level and labels it", () => {
    const result = estimateNoise({ FAN_MOUNT_1: fan({ noiseLevelDba: 22.6 }) });
    expect(result).toMatchObject({ db: 22.6, label: "Silent", fanCount: 1 });
  });

  it("adds levels logarithmically: two equal fans are ~3 dB louder, not double", () => {
    const one = estimateNoise({ FAN_MOUNT_1: fan({ noiseLevelDba: 30 }) }).db!;
    const two = estimateNoise({ FAN_MOUNT_1: fan({ noiseLevelDba: 30 }), FAN_MOUNT_2: fan({ noiseLevelDba: 30 }) }).db!;
    expect(two - one).toBeCloseTo(3, 0);
  });

  it("falls back to a size-based estimate and ignores non-fan-mount placements", () => {
    expect(estimateFanDba(140)).toBe(23);
    expect(estimateFanDba(undefined)).toBe(25);
    const result = estimateNoise({
      FAN_MOUNT_1: fan({ sizeMm: 140 }),
      RADIATOR_MOUNT_1: fan({ noiseLevelDba: 99 }),
    });
    expect(result).toMatchObject({ db: 23, fanCount: 1 });
  });

  it("labels by threshold", () => {
    expect([20, 30, 40, 50].map(noiseLabel)).toEqual(["Silent", "Quiet", "Moderate", "Loud"]);
  });
});

describe("thermals", () => {
  const noFans = summarizeAirflow({});
  const goodFlow = summarizeAirflow({
    FAN_MOUNT_1: fan({ airflowCfm: 90 }),
    FAN_MOUNT_2: fan({ airflowCfm: 90 }),
  });

  it("scales the factor with case airflow", () => {
    expect(airflowFactor(noFans)).toBe(1.2);
    expect(airflowFactor(summarizeAirflow({ FAN_MOUNT_2: fan({ airflowCfm: 50 }) }))).toBe(1.1);
    expect(airflowFactor(summarizeAirflow({ FAN_MOUNT_1: fan({ airflowCfm: 50 }), FAN_MOUNT_2: fan({ airflowCfm: 50 }) }))).toBe(1.0);
    expect(airflowFactor(goodFlow)).toBe(0.9);
  });

  it("returns null components when the CPU/GPU is missing", () => {
    expect(estimateThermals([], goodFlow)).toMatchObject({ cpu: null, gpu: null });
  });

  it("a stock cooler is hotter than a big air cooler for the same CPU", () => {
    const stock = estimateThermals([cpu7800x3d], goodFlow);
    const tower = estimateThermals([cpu7800x3d, line("AIR_COOLER", { tdpRatingWatts: 250 })], goodFlow);
    expect(stock.cpuCooler).toContain("stock");
    expect(tower.cpuCooler).toBe("air cooler");
    expect(stock.cpu!.tempC).toBeGreaterThan(tower.cpu!.tempC);
  });

  it("prefers an AIO's rated capacity and looks it up by radiator size", () => {
    const result = estimateThermals([cpu7800x3d, line("AIO_COOLER", { radiatorSizeMm: 360 })], goodFlow);
    expect(result.cpuCooler).toBe("360mm AIO");
    expect(result.cpu!.rating).toBe("Cool");
  });

  it("better case airflow lowers temperatures", () => {
    // A real cooler is included so neither CPU temperature hits the 105°C clamp.
    const tower = line("AIR_COOLER", { tdpRatingWatts: 250 });
    const hot = estimateThermals([cpu7800x3d, tower, gpu4090], noFans);
    const cool = estimateThermals([cpu7800x3d, tower, gpu4090], goodFlow);
    expect(hot.gpu!.tempC).toBeGreaterThan(cool.gpu!.tempC);
    expect(hot.cpu!.tempC).toBeGreaterThan(cool.cpu!.tempC);
  });

  it("clamps temperatures and rates them", () => {
    const extreme = estimateThermals([line("CPU", { tdpWatts: 5000 })], noFans);
    expect(extreme.cpu!.tempC).toBe(105);
    expect([60, 75, 90].map(thermalRating)).toEqual(["Cool", "Warm", "Hot"]);
  });
});

describe("performance", () => {
  it("needs both a CPU and a GPU", () => {
    expect(estimatePerformance([])).toBeNull();
    expect(estimatePerformance([cpu7800x3d])).toBeNull();
    expect(estimatePerformance([gpu4070])).toBeNull();
  });

  it("scores a flagship GPU well above a mid-range one", () => {
    const mid = estimatePerformance([cpu7800x3d, gpu4070])!;
    const top = estimatePerformance([cpu7800x3d, gpu4090])!;
    expect(top.gpuScore!).toBeGreaterThan(mid.gpuScore! * 1.6);
    expect(top.score).toBeGreaterThan(mid.score);
    expect(top.tier).toBe("Enthusiast");
    expect(mid.tier).toBe("High-end");
  });

  it("rates the cache-heavy CPU above a higher-core-count one for gaming", () => {
    expect(cpuIndex(cpu7800x3d.specifications)!).toBeGreaterThan(cpuIndex(cpu13600k.specifications)!);
  });

  it("flags a bottleneck when one side is under half of the other", () => {
    const weakCpu = line("CPU", { boostClockGhz: 2.0, coreCount: 2, cacheMb: 4 });
    expect(estimatePerformance([weakCpu, gpu4090])!.bottleneck).toBe("CPU");
    expect(estimatePerformance([cpu7800x3d, gpu4070])!.bottleneck).toBeNull();
  });

  it("maps scores to tiers and copes with missing GPU fields", () => {
    expect([10, 30, 60, 90].map(performanceTier)).toEqual(["Entry", "Mainstream", "High-end", "Enthusiast"]);
    expect(gpuIndex({ powerDrawWatts: 100 })).toBeNull();
    expect(cpuIndex({})).toBeNull();
  });
});
