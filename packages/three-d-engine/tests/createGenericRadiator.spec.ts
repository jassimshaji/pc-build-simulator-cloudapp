import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericRadiator } from "../src/procedural/createGenericRadiator";
import { mm } from "../src/procedural/units";

describe("createGenericRadiator", () => {
  it("returns a Group", () => {
    expect(createGenericRadiator({ sizeMm: 240 })).toBeInstanceOf(Group);
  });

  it("sizes length to sizeMm and width to the fixed 120mm fan width", () => {
    const result = createGenericRadiator({ sizeMm: 240 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.x).toBeCloseTo(mm(240), 5);
    expect(size.y).toBeCloseTo(mm(120), 5);
  });

  it("uses a given thicknessMm instead of the default", () => {
    const result = createGenericRadiator({ sizeMm: 240, thicknessMm: 45 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.z).toBeCloseTo(mm(45), 5);
  });

  it("sizes a 360mm radiator longer than a 240mm radiator", () => {
    const small = new Box3()
      .setFromObject(createGenericRadiator({ sizeMm: 240 }))
      .getSize(new Vector3());
    const large = new Box3()
      .setFromObject(createGenericRadiator({ sizeMm: 360 }))
      .getSize(new Vector3());
    expect(large.x).toBeGreaterThan(small.x);
  });
});
