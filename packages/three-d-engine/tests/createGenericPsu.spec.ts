import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericPsu } from "../src/procedural/createGenericPsu";
import { mm } from "../src/procedural/units";

describe("createGenericPsu", () => {
  it("returns a Group", () => {
    expect(createGenericPsu({ formFactor: "ATX", length: 160 })).toBeInstanceOf(Group);
  });

  it("sizes an ATX unit to its standard 150mm x 86mm cross-section and given length", () => {
    const result = createGenericPsu({ formFactor: "ATX", length: 160 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.x).toBeCloseTo(mm(150), 5);
    expect(size.z).toBeCloseTo(mm(160), 5);
  });

  it("sizes an SFX unit smaller in cross-section than ATX", () => {
    const atx = new Box3()
      .setFromObject(createGenericPsu({ formFactor: "ATX", length: 160 }))
      .getSize(new Vector3());
    const sfx = new Box3()
      .setFromObject(createGenericPsu({ formFactor: "SFX", length: 100 }))
      .getSize(new Vector3());
    expect(sfx.x).toBeLessThan(atx.x);
    expect(sfx.y).toBeLessThan(atx.y);
  });
});
