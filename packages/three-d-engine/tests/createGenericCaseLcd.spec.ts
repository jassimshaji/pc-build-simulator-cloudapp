import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericCaseLcd } from "../src/procedural/createGenericCaseLcd";
import { mm } from "../src/procedural/units";

describe("createGenericCaseLcd", () => {
  it("returns a Group", () => {
    expect(createGenericCaseLcd({ displaySizeInches: 5 })).toBeInstanceOf(Group);
  });

  it("sizes a square panel from the display diagonal", () => {
    const result = createGenericCaseLcd({ displaySizeInches: 5 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    // 5" diagonal / sqrt(2) ~= 89.7mm per side
    expect(size.x).toBeCloseTo(mm(89.7), 1);
    expect(size.y).toBeCloseTo(size.x, 5);
    expect(size.z).toBeCloseTo(mm(8), 5);
  });

  it("sizes a larger display larger than a smaller one", () => {
    const small = new Box3()
      .setFromObject(createGenericCaseLcd({ displaySizeInches: 3.5 }))
      .getSize(new Vector3());
    const large = new Box3()
      .setFromObject(createGenericCaseLcd({ displaySizeInches: 7 }))
      .getSize(new Vector3());
    expect(large.x).toBeGreaterThan(small.x);
  });
});
