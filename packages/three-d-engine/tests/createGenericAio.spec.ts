import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericAio } from "../src/procedural/createGenericAio";
import { mm } from "../src/procedural/units";

describe("createGenericAio", () => {
  it("returns a Group", () => {
    expect(createGenericAio({ radiatorSizeMm: 240 })).toBeInstanceOf(Group);
  });

  it("sizes the radiator portion to the given radiatorSizeMm", () => {
    const result = createGenericAio({ radiatorSizeMm: 360 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.x).toBeCloseTo(mm(360), 5);
  });

  it("includes a pump mesh that extends the bounding box below the radiator", () => {
    const result = createGenericAio({ radiatorSizeMm: 240 });
    const box = new Box3().setFromObject(result);
    // The radiator alone spans +/- 60mm in y (120mm width); the pump sits at
    // y=-80mm with its own 40mm height, so the combined box must extend
    // further down than the radiator alone would.
    expect(box.min.y).toBeLessThan(-mm(60));
  });

  it("sizes a larger radiator's group wider than a smaller one", () => {
    const small = new Box3().setFromObject(createGenericAio({ radiatorSizeMm: 120 })).getSize(new Vector3());
    const large = new Box3().setFromObject(createGenericAio({ radiatorSizeMm: 420 })).getSize(new Vector3());
    expect(large.x).toBeGreaterThan(small.x);
  });
});
