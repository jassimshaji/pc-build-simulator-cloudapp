import { describe, expect, it } from "vitest";
import { generateCaseZones } from "../src/zones/generateCaseZones";

const baseSpec = {
  dimensions: { width: 210, height: 450, depth: 450 },
  maxGpuLengthMm: 381,
  maxCpuCoolerHeightMm: 165,
};

describe("generateCaseZones", () => {
  it("always includes the fixed zones: mobo tray, PSU bay, one expansion slot, one cooler mount", () => {
    const zones = generateCaseZones(baseSpec);
    const keys = zones.map((zone) => zone.key);
    expect(keys).toEqual(
      expect.arrayContaining(["MOBO_TRAY", "PSU_BAY", "EXPANSION_SLOT_1", "CPU_COOLER_MOUNT"]),
    );
  });

  it("assigns the correct acceptsCategory to each fixed zone", () => {
    const zones = generateCaseZones(baseSpec);
    const byKey = Object.fromEntries(zones.map((zone) => [zone.key, zone]));
    expect(byKey.MOBO_TRAY.acceptsCategory).toBe("MOTHERBOARD");
    expect(byKey.PSU_BAY.acceptsCategory).toBe("PSU");
    expect(byKey.EXPANSION_SLOT_1.acceptsCategory).toBe("GPU");
    expect(byKey.CPU_COOLER_MOUNT.acceptsCategory).toBe("AIR_COOLER");
  });

  it("carries the case's clearance fields as constraints on the relevant zones", () => {
    const zones = generateCaseZones(baseSpec);
    const byKey = Object.fromEntries(zones.map((zone) => [zone.key, zone]));
    expect(byKey.EXPANSION_SLOT_1.constraints).toEqual({ maxLengthMm: 381 });
    expect(byKey.CPU_COOLER_MOUNT.constraints).toEqual({ maxHeightMm: 165 });
  });

  it("generates one radiator mount zone per radiatorSupport entry", () => {
    const zones = generateCaseZones({
      ...baseSpec,
      radiatorSupport: ["240mm front", "280mm front", "120mm rear"],
    });
    const radiatorZones = zones.filter((zone) => zone.key.startsWith("RADIATOR_MOUNT_"));
    expect(radiatorZones).toHaveLength(3);
    expect(radiatorZones.every((zone) => zone.acceptsCategory === "AIO_COOLER")).toBe(true);
  });

  it("generates one fan mount zone per fanSupportMm entry", () => {
    const zones = generateCaseZones({ ...baseSpec, fanSupportMm: [120, 140] });
    const fanZones = zones.filter((zone) => zone.key.startsWith("FAN_MOUNT_"));
    expect(fanZones).toHaveLength(2);
    expect(fanZones.every((zone) => zone.acceptsCategory === "FAN")).toBe(true);
  });

  it("expands driveBays counts into individual drive bay zones", () => {
    const zones = generateCaseZones({
      ...baseSpec,
      driveBays: { "3.5in": 2, "2.5in": 1 },
    });
    const driveZones = zones.filter((zone) => zone.key.startsWith("DRIVE_BAY_"));
    expect(driveZones).toHaveLength(3);
    expect(driveZones.every((zone) => zone.acceptsCategory === "SSD")).toBe(true);
    expect(driveZones.map((zone) => zone.constraints?.bayType)).toEqual([
      "3.5in",
      "3.5in",
      "2.5in",
    ]);
  });

  it("produces no radiator/fan/drive zones when those fields are absent", () => {
    const zones = generateCaseZones(baseSpec);
    expect(zones.some((zone) => zone.key.startsWith("RADIATOR_MOUNT_"))).toBe(false);
    expect(zones.some((zone) => zone.key.startsWith("FAN_MOUNT_"))).toBe(false);
    expect(zones.some((zone) => zone.key.startsWith("DRIVE_BAY_"))).toBe(false);
  });
});
