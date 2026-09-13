import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericSsd } from "../src/procedural/createGenericSsd";
import { mm } from "../src/procedural/units";

describe("createGenericSsd", () => {
  it("returns a Group", () => {
    expect(createGenericSsd({ formFactor: "M.2 NVMe" })).toBeInstanceOf(Group);
  });

  it("sizes an M.2 NVMe drive to the M.2 2280 footprint", () => {
    const result = createGenericSsd({ formFactor: "M.2 NVMe" });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.x).toBeCloseTo(mm(80), 5);
    expect(size.z).toBeCloseTo(mm(22), 5);
  });

  it("sizes M.2 SATA the same as M.2 NVMe (same physical footprint)", () => {
    const nvme = new Box3()
      .setFromObject(createGenericSsd({ formFactor: "M.2 NVMe" }))
      .getSize(new Vector3());
    const sata = new Box3()
      .setFromObject(createGenericSsd({ formFactor: "M.2 SATA" }))
      .getSize(new Vector3());
    expect(sata).toEqual(nvme);
  });

  it("sizes a 2.5\" SATA drive larger than an M.2 drive", () => {
    const m2 = new Box3().setFromObject(createGenericSsd({ formFactor: "M.2 NVMe" })).getSize(new Vector3());
    const sata25 = new Box3()
      .setFromObject(createGenericSsd({ formFactor: "SATA 2.5\"" }))
      .getSize(new Vector3());
    expect(sata25.x).toBeGreaterThan(m2.x);
    expect(sata25.z).toBeGreaterThan(m2.z);
  });
});
