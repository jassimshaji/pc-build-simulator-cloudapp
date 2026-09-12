import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericMotherboard } from "../src/procedural/createGenericMotherboard";
import { mm } from "../src/procedural/units";

describe("createGenericMotherboard", () => {
  it("returns a Group", () => {
    expect(createGenericMotherboard({ formFactor: "ATX" })).toBeInstanceOf(Group);
  });

  it("sizes the board to the ATX footprint (305mm x 244mm)", () => {
    const result = createGenericMotherboard({ formFactor: "ATX" });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.x).toBeCloseTo(mm(305), 5);
    expect(size.z).toBeCloseTo(mm(244), 5);
  });

  it("sizes Mini-ITX smaller than E-ATX", () => {
    const itx = new Box3()
      .setFromObject(createGenericMotherboard({ formFactor: "Mini-ITX" }))
      .getSize(new Vector3());
    const eatx = new Box3()
      .setFromObject(createGenericMotherboard({ formFactor: "E-ATX" }))
      .getSize(new Vector3());
    expect(itx.x).toBeLessThan(eatx.x);
    expect(itx.z).toBeLessThan(eatx.z);
  });
});
