import { describe, expect, it } from "vitest";
import { extractHotFields, validateSpecifications } from "../src/registry";

describe("validateSpecifications", () => {
  it("validates a known category against its real schema", () => {
    const result = validateSpecifications("CPU", {
      socket: "AM5",
      architecture: "Zen 4",
      coreCount: 8,
      threadCount: 16,
      baseClockGhz: 4.2,
      boostClockGhz: 5.0,
      cacheMb: 96,
      tdpWatts: 120,
      memorySupport: ["DDR5"],
      pcieGeneration: "5.0",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid spec for a known category", () => {
    const result = validateSpecifications("CPU", { socket: "AM5" });
    expect(result.success).toBe(false);
  });

  it("falls back to the permissive generic schema for an unknown category key", () => {
    const result = validateSpecifications("CAPTURE_CARD", { hdmiInputs: 1 });
    expect(result.success).toBe(true);
  });
});

describe("extractHotFields", () => {
  it("extracts CPU hot fields (socket, tdpWatts, pcieGeneration)", () => {
    const hotFields = extractHotFields("CPU", {
      socket: "AM5",
      architecture: "Zen 4",
      coreCount: 8,
      threadCount: 16,
      baseClockGhz: 4.2,
      boostClockGhz: 5.0,
      cacheMb: 96,
      tdpWatts: 120,
      memorySupport: ["DDR5"],
      pcieGeneration: "5.0",
    });
    expect(hotFields).toEqual({ socket: "AM5", tdpWatts: 120, pcieGeneration: "5.0" });
  });

  it("extracts GPU hot fields (powerDrawWatts, pcieGeneration, dimensions)", () => {
    const hotFields = extractHotFields("GPU", {
      gpuArchitecture: "Ada Lovelace",
      vramCapacityGb: 12,
      vramType: "GDDR6X",
      powerDrawWatts: 200,
      pcieGeneration: "4.0",
      lengthMm: 242,
      widthMm: 112,
      heightMm: 40,
      slotWidth: 2,
    });
    expect(hotFields).toEqual({
      powerDrawWatts: 200,
      pcieGeneration: "4.0",
      lengthMm: 242,
      widthMm: 112,
      heightMm: 40,
    });
  });

  it("extracts Motherboard hot fields (socket, formFactor, ramType)", () => {
    const hotFields = extractHotFields("MOTHERBOARD", {
      socket: "AM5",
      chipset: "B650",
      formFactor: "ATX",
      ramSlots: 4,
      maxRamGb: 128,
      ramType: "DDR5",
      pcieSlots: 3,
      m2Slots: 4,
      sataPorts: 4,
    });
    expect(hotFields).toEqual({
      socket: "AM5",
      formFactor: "ATX",
      ramType: "DDR5",
      pcieGeneration: undefined,
    });
  });

  it("extracts Case hot fields from the primary form factor and external dimensions", () => {
    const hotFields = extractHotFields("CASE", {
      caseType: "Mid Tower",
      supportedMotherboardFormFactors: ["ATX", "Micro-ATX", "Mini-ITX"],
      maxGpuLengthMm: 381,
      maxCpuCoolerHeightMm: 165,
      dimensionsMm: { height: 460, width: 210, depth: 428 },
    });
    expect(hotFields).toEqual({
      formFactor: "ATX",
      widthMm: 210,
      heightMm: 460,
      lengthMm: 428,
    });
  });

  it("returns an empty object for a spec that fails validation", () => {
    expect(extractHotFields("CPU", { socket: "AM5" })).toEqual({});
  });

  it("returns an empty object for categories with nothing to promote (e.g. FAN)", () => {
    expect(extractHotFields("FAN", { sizeMm: 120 })).toEqual({});
  });
});
