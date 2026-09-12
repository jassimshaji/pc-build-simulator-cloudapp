import { describe, expect, it } from "vitest";
import { generateMotherboardZones } from "../src/zones/generateMotherboardZones";

describe("generateMotherboardZones", () => {
  it("always includes exactly one CPU socket zone", () => {
    const zones = generateMotherboardZones({
      ramSlots: 4,
      pcieSlots: 3,
      m2Slots: 4,
      sataPorts: 4,
    });
    const cpuZones = zones.filter((zone) => zone.key === "CPU_SOCKET");
    expect(cpuZones).toHaveLength(1);
    expect(cpuZones[0].acceptsCategory).toBe("CPU");
  });

  it("generates exactly ramSlots RAM zones, uniquely keyed", () => {
    const zones = generateMotherboardZones({ ramSlots: 4, pcieSlots: 0, m2Slots: 0, sataPorts: 0 });
    const ramZones = zones.filter((zone) => zone.key.startsWith("RAM_SLOT_"));
    expect(ramZones).toHaveLength(4);
    expect(new Set(ramZones.map((zone) => zone.key)).size).toBe(4);
    expect(ramZones.every((zone) => zone.acceptsCategory === "RAM")).toBe(true);
  });

  it("generates exactly pcieSlots GPU-accepting zones", () => {
    const zones = generateMotherboardZones({ ramSlots: 0, pcieSlots: 3, m2Slots: 0, sataPorts: 0 });
    const pcieZones = zones.filter((zone) => zone.key.startsWith("PCIE_SLOT_"));
    expect(pcieZones).toHaveLength(3);
    expect(pcieZones.every((zone) => zone.acceptsCategory === "GPU")).toBe(true);
  });

  it("generates exactly m2Slots + sataPorts SSD-accepting zones", () => {
    const zones = generateMotherboardZones({ ramSlots: 0, pcieSlots: 0, m2Slots: 4, sataPorts: 4 });
    const ssdZones = zones.filter((zone) => zone.acceptsCategory === "SSD");
    expect(ssdZones).toHaveLength(8);
    expect(zones.filter((zone) => zone.key.startsWith("M2_SLOT_"))).toHaveLength(4);
    expect(zones.filter((zone) => zone.key.startsWith("SATA_PORT_"))).toHaveLength(4);
  });

  it("produces no slot zones for a board with zero of a given slot type", () => {
    const zones = generateMotherboardZones({ ramSlots: 0, pcieSlots: 0, m2Slots: 0, sataPorts: 0 });
    expect(zones).toHaveLength(1); // just CPU_SOCKET
  });
});
