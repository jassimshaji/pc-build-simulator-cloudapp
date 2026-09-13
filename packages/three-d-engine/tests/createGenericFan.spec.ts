import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericFan } from "../src/procedural/createGenericFan";
import { mm } from "../src/procedural/units";

describe("createGenericFan", () => {
  it("returns a Group", () => {
    expect(createGenericFan({ sizeMm: 120 })).toBeInstanceOf(Group);
  });

  it("sizes the frame to a 120mm square with the default thickness", () => {
    const result = createGenericFan({ sizeMm: 120 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.x).toBeCloseTo(mm(120), 5);
    expect(size.y).toBeCloseTo(mm(120), 5);
    expect(size.z).toBeCloseTo(mm(25), 5);
  });

  it("uses a given thicknessMm instead of the default", () => {
    const result = createGenericFan({ sizeMm: 140, thicknessMm: 15 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.z).toBeCloseTo(mm(15), 5);
  });

  it("sizes a 140mm fan larger than a 120mm fan", () => {
    const small = new Box3().setFromObject(createGenericFan({ sizeMm: 120 })).getSize(new Vector3());
    const large = new Box3().setFromObject(createGenericFan({ sizeMm: 140 })).getSize(new Vector3());
    expect(large.x).toBeGreaterThan(small.x);
  });
});
