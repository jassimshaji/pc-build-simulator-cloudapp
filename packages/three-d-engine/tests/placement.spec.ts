import { describe, expect, it } from "vitest";
import { Group } from "three";
import { buildGenericModel, extractCaseZoneSpec, extractMotherboardZoneSpec } from "../src/placement";

describe("extractCaseZoneSpec", () => {
  it("returns null when dimensionsMm is missing", () => {
    expect(extractCaseZoneSpec({})).toBeNull();
  });

  it("returns null when dimensionsMm is incomplete", () => {
    expect(extractCaseZoneSpec({ dimensionsMm: { width: 210, height: 450 } })).toBeNull();
  });

  it("extracts real fields and falls back for missing optional ones", () => {
    const spec = extractCaseZoneSpec({
      dimensionsMm: { width: 210, height: 450, depth: 450 },
      maxGpuLengthMm: 381,
      maxCpuCoolerHeightMm: 165,
      driveBays: { "3.5in": 2 },
      fanSupportMm: [120, 140],
      radiatorSupport: ["240mm front"],
    });
    expect(spec).toEqual({
      dimensions: { width: 210, height: 450, depth: 450 },
      maxGpuLengthMm: 381,
      maxCpuCoolerHeightMm: 165,
      driveBays: { "3.5in": 2 },
      fanSupportMm: [120, 140],
      radiatorSupport: ["240mm front"],
    });
  });

  it("falls back to default clearance values when absent", () => {
    const spec = extractCaseZoneSpec({ dimensionsMm: { width: 200, height: 400, depth: 400 } });
    expect(spec?.maxGpuLengthMm).toBe(380);
    expect(spec?.maxCpuCoolerHeightMm).toBe(165);
  });
});

describe("extractMotherboardZoneSpec", () => {
  it("returns null when any slot count is missing", () => {
    expect(extractMotherboardZoneSpec({ ramSlots: 4, pcieSlots: 3, m2Slots: 4 })).toBeNull();
  });

  it("extracts all four slot counts", () => {
    const spec = extractMotherboardZoneSpec({
      ramSlots: 4,
      pcieSlots: 3,
      m2Slots: 4,
      sataPorts: 4,
    });
    expect(spec).toEqual({ ramSlots: 4, pcieSlots: 3, m2Slots: 4, sataPorts: 4 });
  });
});

describe("buildGenericModel", () => {
  it("builds a MOTHERBOARD model from a real formFactor field", () => {
    const model = buildGenericModel("MOTHERBOARD", { formFactor: "Micro-ATX" });
    expect(model).toBeInstanceOf(Group);
  });

  it("falls back to ATX when a MOTHERBOARD's formFactor is missing or invalid", () => {
    expect(buildGenericModel("MOTHERBOARD", {})).toBeInstanceOf(Group);
  });

  it("builds a CPU model from a real socket field", () => {
    const model = buildGenericModel("CPU", { socket: "AM5" });
    expect(model).toBeInstanceOf(Group);
  });

  it("builds a GPU model, approximating the untracked fan count", () => {
    const model = buildGenericModel("GPU", {
      lengthMm: 300,
      widthMm: 40,
      heightMm: 120,
      slotWidth: 2,
    });
    expect(model).toBeInstanceOf(Group);
  });

  it("builds a RAM model, approximating the untracked module height", () => {
    const model = buildGenericModel("RAM", { formFactor: "SODIMM" });
    expect(model).toBeInstanceOf(Group);
  });

  it("builds a PSU model, falling back to a default length when absent", () => {
    const model = buildGenericModel("PSU", { formFactor: "SFX" });
    expect(model).toBeInstanceOf(Group);
  });

  it("returns null for categories without a generator yet", () => {
    expect(buildGenericModel("FAN", {})).toBeNull();
    expect(buildGenericModel("MONITOR", {})).toBeNull();
  });
});
