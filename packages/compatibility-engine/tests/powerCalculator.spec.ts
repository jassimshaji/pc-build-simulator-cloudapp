import { describe, expect, it } from "vitest";
import {
  estimateSystemPower,
  calculateRecommendedPsuWattage,
  DEFAULT_PSU_HEADROOM_MULTIPLIER,
} from "../src/powerCalculator";
import { build, component } from "./helpers";

describe("estimateSystemPower", () => {
  it("returns 0 for an empty build", () => {
    expect(estimateSystemPower(build())).toBe(0);
  });

  it("sums CPU tdpWatts and GPU powerDrawWatts directly from hot fields", () => {
    const cpu = component("CPU", { hotFields: { tdpWatts: 105 } });
    const gpu = component("GPU", { hotFields: { powerDrawWatts: 320 } });
    expect(estimateSystemPower(build(cpu, gpu))).toBe(425);
  });

  it("multiplies by quantity for repeated components", () => {
    const gpu = component("GPU", { hotFields: { powerDrawWatts: 100 }, quantity: 2 });
    expect(estimateSystemPower(build(gpu))).toBe(200);
  });

  it("adds a flat baseline once per installed motherboard", () => {
    const motherboard = component("MOTHERBOARD");
    expect(estimateSystemPower(build(motherboard))).toBe(30);
  });

  it("estimates RAM draw per module, using numberOfModules when present", () => {
    const ram = component("RAM", { specifications: { numberOfModules: 2 } });
    // 5W estimate * 2 modules
    expect(estimateSystemPower(build(ram))).toBe(10);
  });

  it("falls back to treating RAM as a single module when numberOfModules is absent", () => {
    const ram = component("RAM");
    expect(estimateSystemPower(build(ram))).toBe(5);
  });

  it("estimates a flat draw per installed SSD", () => {
    const ssd = component("SSD", { quantity: 2 });
    expect(estimateSystemPower(build(ssd))).toBe(12);
  });

  it("uses a fan's own powerConsumptionWatts when present", () => {
    const fan = component("FAN", { specifications: { powerConsumptionWatts: 2.5 } });
    expect(estimateSystemPower(build(fan))).toBe(2.5);
  });

  it("falls back to a small constant when a fan has no powerConsumptionWatts", () => {
    const fan = component("FAN");
    expect(estimateSystemPower(build(fan))).toBe(3);
  });

  it("estimates a flat draw per installed AIO pump", () => {
    const aio = component("AIO_COOLER");
    expect(estimateSystemPower(build(aio))).toBe(5);
  });

  it("sums draw across a full mixed build", () => {
    const cpu = component("CPU", { hotFields: { tdpWatts: 65 } });
    const motherboard = component("MOTHERBOARD");
    const ram = component("RAM", { specifications: { numberOfModules: 2 } });
    const ssd = component("SSD");
    // 65 (CPU) + 30 (mobo baseline) + 10 (2 RAM modules * 5W) + 6 (SSD) = 111
    expect(estimateSystemPower(build(cpu, motherboard, ram, ssd))).toBe(111);
  });
});

describe("calculateRecommendedPsuWattage", () => {
  it("applies the default 1.25 headroom multiplier and rounds up", () => {
    expect(calculateRecommendedPsuWattage(400)).toBe(Math.ceil(400 * DEFAULT_PSU_HEADROOM_MULTIPLIER));
    expect(calculateRecommendedPsuWattage(401)).toBe(502); // 401 * 1.25 = 501.25 -> 502
  });

  it("accepts a custom headroom multiplier", () => {
    expect(calculateRecommendedPsuWattage(400, 1.5)).toBe(600);
  });

  it("returns 0 for 0 watts", () => {
    expect(calculateRecommendedPsuWattage(0)).toBe(0);
  });
});
