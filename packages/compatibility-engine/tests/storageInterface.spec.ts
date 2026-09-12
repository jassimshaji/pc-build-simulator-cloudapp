import { describe, expect, it } from "vitest";
import { checkM2SlotAvailability, checkSataPortAvailability } from "../src/rules/storageInterface";
import { build, component } from "./helpers";

const motherboard = component("MOTHERBOARD", { specifications: { m2Slots: 2, sataPorts: 4 } });

describe("checkM2SlotAvailability", () => {
  it("returns null when there are no M.2 drives", () => {
    const sataSsd = component("SSD", { specifications: { formFactor: "SATA 2.5\"" } });
    expect(checkM2SlotAvailability(build(sataSsd, motherboard))).toBeNull();
  });

  it("returns null when the motherboard is missing", () => {
    const ssd = component("SSD", { specifications: { formFactor: "M.2 NVMe" } });
    expect(checkM2SlotAvailability(build(ssd))).toBeNull();
  });

  it("is compatible when M.2 drives fit within available slots", () => {
    const ssd = component("SSD", { specifications: { formFactor: "M.2 NVMe" } });
    const result = checkM2SlotAvailability(build(ssd, motherboard));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("counts both M.2 NVMe and M.2 SATA drives toward the same slot pool", () => {
    const nvme = component("SSD", { specifications: { formFactor: "M.2 NVMe" } });
    const m2Sata = component("SSD", { specifications: { formFactor: "M.2 SATA" } });
    const thirdM2 = component("SSD", { specifications: { formFactor: "M.2 NVMe" } });
    const result = checkM2SlotAvailability(build(nvme, m2Sata, thirdM2, motherboard));
    // 3 M.2 drives requested against 2 slots
    expect(result).toMatchObject({ compatible: false, severity: "ERROR" });
  });
});

describe("checkSataPortAvailability", () => {
  it("returns null when there are no 2.5\" SATA drives", () => {
    const nvme = component("SSD", { specifications: { formFactor: "M.2 NVMe" } });
    expect(checkSataPortAvailability(build(nvme, motherboard))).toBeNull();
  });

  it("is compatible when SATA drives fit within available ports", () => {
    const ssd = component("SSD", { specifications: { formFactor: "SATA 2.5\"" }, quantity: 3 });
    const result = checkSataPortAvailability(build(ssd, motherboard));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is an ERROR when SATA drives exceed available ports", () => {
    const ssd = component("SSD", { specifications: { formFactor: "SATA 2.5\"" }, quantity: 5 });
    const result = checkSataPortAvailability(build(ssd, motherboard));
    expect(result).toMatchObject({ compatible: false, severity: "ERROR" });
  });
});
