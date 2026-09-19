import { describe, expect, it } from "vitest";
import {
  estimateCfm,
  fanFlowDirection,
  fanMountFaceForZone,
  isFanMountZone,
  streamLoopsPerSecond,
  streamProgress,
  summarizeAirflow,
} from "../src/airflow";
import { generateCaseZones } from "../src/zones";

const fan = (spec: Record<string, unknown>) => ({ categoryKey: "FAN", specifications: spec });

describe("fanFlowDirection", () => {
  it("normal blades intake at the front and exhaust at the rear/top", () => {
    expect(fanFlowDirection("Forward Blade", "FRONT")).toBe("INTAKE");
    expect(fanFlowDirection(undefined, "FRONT")).toBe("INTAKE");
    expect(fanFlowDirection("Forward Blade", "REAR")).toBe("EXHAUST");
    expect(fanFlowDirection("Forward Blade", "TOP")).toBe("EXHAUST");
  });

  it("reverse blades flip the direction on every face", () => {
    expect(fanFlowDirection("Reverse Blade", "FRONT")).toBe("EXHAUST");
    expect(fanFlowDirection("Reverse Blade", "REAR")).toBe("INTAKE");
    expect(fanFlowDirection("Reverse Blade", "TOP")).toBe("INTAKE");
  });
});

describe("fanMountFaceForZone", () => {
  it("maps FAN_MOUNT_n to front, rear, top, then cycles", () => {
    expect(["FAN_MOUNT_1", "FAN_MOUNT_2", "FAN_MOUNT_3", "FAN_MOUNT_4"].map(fanMountFaceForZone)).toEqual([
      "FRONT",
      "REAR",
      "TOP",
      "FRONT",
    ]);
    expect(fanMountFaceForZone("RADIATOR_MOUNT_1")).toBeNull();
    expect(fanMountFaceForZone("FAN_MOUNT_x")).toBeNull();
  });
});

describe("estimateCfm", () => {
  it("scales with swept area from a 120mm/50CFM anchor and defaults to 120mm", () => {
    expect(estimateCfm(120)).toBe(50);
    expect(estimateCfm(140)).toBe(68);
    expect(estimateCfm(undefined)).toBe(50);
  });
});

describe("summarizeAirflow", () => {
  it("reports NONE with no fans", () => {
    const summary = summarizeAirflow({});
    expect(summary.pressure).toBe("NONE");
    expect(summary.fans).toEqual([]);
  });

  it("is BALANCED for a typical front-intake + rear-exhaust pair", () => {
    const summary = summarizeAirflow({
      FAN_MOUNT_1: fan({ airflowCfm: 60 }),
      FAN_MOUNT_2: fan({ airflowCfm: 60 }),
    });
    expect(summary).toMatchObject({ intakeCfm: 60, exhaustCfm: 60, netCfm: 0, pressure: "BALANCED" });
    expect(summary.fans.map((f) => [f.face, f.flow])).toEqual([
      ["FRONT", "INTAKE"],
      ["REAR", "EXHAUST"],
    ]);
  });

  it("is POSITIVE when intake outweighs exhaust", () => {
    const summary = summarizeAirflow({
      FAN_MOUNT_1: fan({ airflowCfm: 80 }),
      FAN_MOUNT_2: fan({ airflowCfm: 40 }),
    });
    expect(summary).toMatchObject({ intakeCfm: 80, exhaustCfm: 40, netCfm: 40, pressure: "POSITIVE" });
  });

  it("is NEGATIVE when exhaust outweighs intake (e.g. a reversed front fan)", () => {
    const summary = summarizeAirflow({
      FAN_MOUNT_1: fan({ airflowCfm: 60, bladeDirection: "Reverse Blade" }),
      FAN_MOUNT_2: fan({ airflowCfm: 60 }),
    });
    expect(summary).toMatchObject({ intakeCfm: 0, exhaustCfm: 120, pressure: "NEGATIVE" });
  });

  it("is BALANCED within 10% of total airflow", () => {
    const summary = summarizeAirflow({
      FAN_MOUNT_1: fan({ airflowCfm: 52 }),
      FAN_MOUNT_2: fan({ airflowCfm: 50 }),
    });
    expect(summary.pressure).toBe("BALANCED");
  });

  it("ignores non-fan placements and non-fan-mount zones, and sorts fans numerically", () => {
    const summary = summarizeAirflow({
      FAN_MOUNT_10: fan({ airflowCfm: 10 }),
      FAN_MOUNT_2: fan({ airflowCfm: 20 }),
      MOBO_TRAY: { categoryKey: "MOTHERBOARD", specifications: {} },
      RADIATOR_MOUNT_1: fan({ airflowCfm: 99 }),
    });
    expect(summary.fans.map((f) => f.zoneKey)).toEqual(["FAN_MOUNT_2", "FAN_MOUNT_10"]);
  });
});

describe("streamProgress / streamLoopsPerSecond", () => {
  it("staggers particles evenly by index and stays within [0, 1)", () => {
    expect(streamProgress(0, 0, 4, 1)).toBe(0);
    expect(streamProgress(0, 1, 4, 1)).toBeCloseTo(0.25);
    expect(streamProgress(0, 3, 4, 1)).toBeCloseTo(0.75);
    for (const t of [0.4, 1.3, 7.77, 100.1]) {
      const p = streamProgress(t, 2, 6, 0.7);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });

  it("loops: one full period returns to the start", () => {
    expect(streamProgress(2, 1, 4, 0.5)).toBeCloseTo(streamProgress(0, 1, 4, 0.5));
  });

  it("clamps animation speed between 0.3 and 1.2 loops/sec", () => {
    expect(streamLoopsPerSecond(1)).toBe(0.3);
    expect(streamLoopsPerSecond(40)).toBeCloseTo(0.5);
    expect(streamLoopsPerSecond(5000)).toBe(1.2);
  });
});

describe("zone layout stays consistent with the airflow model", () => {
  const zones = generateCaseZones({
    dimensions: { width: 210, height: 460, depth: 428 },
    maxGpuLengthMm: 381,
    maxCpuCoolerHeightMm: 165,
    fanSupportMm: [120, 140, 120, 120],
  }).filter((zone) => isFanMountZone(zone.key));

  it("every mount's declared face matches fanMountFaceForZone", () => {
    expect(zones).toHaveLength(4);
    for (const zone of zones) {
      expect(zone.constraints?.face).toBe(fanMountFaceForZone(zone.key));
    }
  });

  it("positions each face on its own side of the case (front -Z, rear +Z, top +Y)", () => {
    for (const zone of zones) {
      const [, y, z] = zone.position;
      if (zone.constraints?.face === "FRONT") expect(z).toBeLessThan(0);
      if (zone.constraints?.face === "REAR") expect(z).toBeGreaterThan(0);
      if (zone.constraints?.face === "TOP") expect(y).toBeGreaterThan(0);
    }
  });

  it("does not stack two mounts on the same face at the same spot", () => {
    const frontMounts = zones.filter((zone) => zone.constraints?.face === "FRONT");
    expect(frontMounts).toHaveLength(2);
    expect(frontMounts[0].position[0]).not.toBe(frontMounts[1].position[0]);
  });
});
