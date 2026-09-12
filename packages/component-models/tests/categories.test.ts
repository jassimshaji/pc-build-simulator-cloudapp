import { describe, expect, it } from "vitest";
import { cpuSpecSchema } from "../src/categories/cpu";
import { motherboardSpecSchema } from "../src/categories/motherboard";
import { gpuSpecSchema } from "../src/categories/gpu";
import { ramSpecSchema } from "../src/categories/ram";
import { ssdSpecSchema } from "../src/categories/ssd";
import { psuSpecSchema } from "../src/categories/psu";
import { caseSpecSchema } from "../src/categories/case";
import { airCoolerSpecSchema } from "../src/categories/airCooler";
import { aioCoolerSpecSchema } from "../src/categories/aioCooler";
import { fanSpecSchema } from "../src/categories/fan";
import { monitorSpecSchema } from "../src/categories/monitor";
import { caseLcdSpecSchema } from "../src/categories/caseLcd";
import { genericSpecSchema } from "../src/categories/generic";

describe("cpuSpecSchema", () => {
  const valid = {
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
  };

  it("accepts a valid spec", () => {
    expect(cpuSpecSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a spec missing required fields", () => {
    const { socket: _socket, ...withoutSocket } = valid;
    expect(cpuSpecSchema.safeParse(withoutSocket).success).toBe(false);
  });

  it("rejects an unsupported memory type", () => {
    expect(
      cpuSpecSchema.safeParse({ ...valid, memorySupport: ["DDR3"] }).success,
    ).toBe(false);
  });
});

describe("motherboardSpecSchema", () => {
  const valid = {
    socket: "AM5",
    chipset: "B650",
    formFactor: "ATX",
    ramSlots: 4,
    maxRamGb: 128,
    ramType: "DDR5",
    pcieSlots: 3,
    m2Slots: 4,
    sataPorts: 4,
  };

  it("accepts a valid spec", () => {
    expect(motherboardSpecSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid form factor", () => {
    expect(
      motherboardSpecSchema.safeParse({ ...valid, formFactor: "Extra-Wide" }).success,
    ).toBe(false);
  });
});

describe("gpuSpecSchema", () => {
  const valid = {
    gpuArchitecture: "Ada Lovelace",
    vramCapacityGb: 12,
    vramType: "GDDR6X",
    powerDrawWatts: 200,
    pcieGeneration: "4.0",
    lengthMm: 242,
    widthMm: 112,
    heightMm: 40,
    slotWidth: 2,
  };

  it("accepts a valid spec", () => {
    expect(gpuSpecSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a negative length", () => {
    expect(gpuSpecSchema.safeParse({ ...valid, lengthMm: -1 }).success).toBe(false);
  });
});

describe("ramSpecSchema", () => {
  const valid = {
    memoryCapacityGb: 32,
    numberOfModules: 2,
    memoryType: "DDR5",
    speedMtS: 6000,
  };

  it("accepts a valid spec and defaults formFactor to UDIMM", () => {
    const result = ramSpecSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.formFactor).toBe("UDIMM");
    }
  });

  it("rejects an unsupported memory type", () => {
    expect(ramSpecSchema.safeParse({ ...valid, memoryType: "DDR3" }).success).toBe(false);
  });
});

describe("ssdSpecSchema", () => {
  it("accepts a valid NVMe spec", () => {
    expect(
      ssdSpecSchema.safeParse({
        capacityGb: 1000,
        formFactor: "M.2 NVMe",
        interface: "PCIe 4.0 x4",
        pcieGeneration: "4.0",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid form factor", () => {
    expect(
      ssdSpecSchema.safeParse({ capacityGb: 1000, formFactor: "3.5in", interface: "SATA" })
        .success,
    ).toBe(false);
  });
});

describe("psuSpecSchema", () => {
  const valid = {
    wattage: 850,
    efficiencyCertification: "80 PLUS Gold",
    modularType: "Full",
    formFactor: "ATX",
    pciePowerConnectors: 4,
    cpuPowerConnectors: 2,
  };

  it("accepts a valid spec", () => {
    expect(psuSpecSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unknown efficiency certification", () => {
    expect(
      psuSpecSchema.safeParse({ ...valid, efficiencyCertification: "80 PLUS Diamond" }).success,
    ).toBe(false);
  });
});

describe("caseSpecSchema", () => {
  const valid = {
    caseType: "Mid Tower",
    supportedMotherboardFormFactors: ["ATX", "Micro-ATX", "Mini-ITX"],
    maxGpuLengthMm: 381,
    maxCpuCoolerHeightMm: 165,
    dimensionsMm: { height: 460, width: 210, depth: 428 },
  };

  it("accepts a valid spec", () => {
    expect(caseSpecSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty supported-form-factor list", () => {
    expect(
      caseSpecSchema.safeParse({ ...valid, supportedMotherboardFormFactors: [] }).success,
    ).toBe(false);
  });
});

describe("airCoolerSpecSchema", () => {
  it("accepts a valid spec", () => {
    expect(
      airCoolerSpecSchema.safeParse({
        heightMm: 165,
        tdpRatingWatts: 250,
        socketCompatibility: ["AM5", "LGA1700"],
      }).success,
    ).toBe(true);
  });

  it("rejects an empty socket compatibility list", () => {
    expect(
      airCoolerSpecSchema.safeParse({
        heightMm: 165,
        tdpRatingWatts: 250,
        socketCompatibility: [],
      }).success,
    ).toBe(false);
  });
});

describe("aioCoolerSpecSchema", () => {
  it("accepts a valid spec", () => {
    expect(
      aioCoolerSpecSchema.safeParse({
        radiatorSizeMm: 240,
        fanCount: 2,
        socketCompatibility: ["AM5", "LGA1700"],
      }).success,
    ).toBe(true);
  });

  it("rejects a non-standard radiator size", () => {
    expect(
      aioCoolerSpecSchema.safeParse({
        radiatorSizeMm: 200,
        fanCount: 2,
        socketCompatibility: ["AM5"],
      }).success,
    ).toBe(false);
  });
});

describe("fanSpecSchema", () => {
  it("accepts a valid spec and defaults blade direction", () => {
    const result = fanSpecSchema.safeParse({ sizeMm: 120 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bladeDirection).toBe("Forward Blade");
    }
  });
});

describe("monitorSpecSchema", () => {
  it("accepts a valid spec", () => {
    expect(
      monitorSpecSchema.safeParse({
        screenSizeInches: 27,
        resolution: "2560x1440",
        refreshRateHz: 165,
        panelType: "IPS",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown panel type", () => {
    expect(
      monitorSpecSchema.safeParse({
        screenSizeInches: 27,
        resolution: "2560x1440",
        refreshRateHz: 165,
        panelType: "PLASMA",
      }).success,
    ).toBe(false);
  });
});

describe("caseLcdSpecSchema", () => {
  it("accepts a valid spec", () => {
    expect(
      caseLcdSpecSchema.safeParse({
        displaySizeInches: 5,
        resolution: "480x480",
        interface: "USB",
      }).success,
    ).toBe(true);
  });
});

describe("genericSpecSchema", () => {
  it("accepts any plain object", () => {
    expect(genericSpecSchema.safeParse({ anything: "goes", nested: { ok: true } }).success).toBe(
      true,
    );
  });

  it("rejects a non-object", () => {
    expect(genericSpecSchema.safeParse("not an object").success).toBe(false);
  });
});
