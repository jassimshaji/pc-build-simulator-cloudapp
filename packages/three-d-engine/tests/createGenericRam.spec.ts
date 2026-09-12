import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericRam } from "../src/procedural/createGenericRam";
import { mm } from "../src/procedural/units";

describe("createGenericRam", () => {
  it("returns a Group", () => {
    expect(createGenericRam({ formFactor: "UDIMM", height: 34 })).toBeInstanceOf(Group);
  });

  it("sizes a UDIMM stick to 133mm long and the given height", () => {
    const result = createGenericRam({ formFactor: "UDIMM", height: 44 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.x).toBeCloseTo(mm(133), 5);
    expect(size.y).toBeCloseTo(mm(44), 5);
  });

  it("sizes a SODIMM stick shorter than a UDIMM stick", () => {
    const udimm = new Box3()
      .setFromObject(createGenericRam({ formFactor: "UDIMM", height: 30 }))
      .getSize(new Vector3());
    const sodimm = new Box3()
      .setFromObject(createGenericRam({ formFactor: "SODIMM", height: 30 }))
      .getSize(new Vector3());
    expect(sodimm.x).toBeLessThan(udimm.x);
  });
});
