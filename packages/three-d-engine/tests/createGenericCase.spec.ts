import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericCase } from "../src/procedural/createGenericCase";
import { mm } from "../src/procedural/units";

describe("createGenericCase", () => {
  it("returns a Group", () => {
    const result = createGenericCase({
      formFactor: "ATX",
      dimensions: { width: 210, height: 450, depth: 450 },
    });
    expect(result).toBeInstanceOf(Group);
  });

  it("sizes the wireframe shell to the given dimensions", () => {
    const dimensions = { width: 210, height: 450, depth: 480 };
    const result = createGenericCase({ formFactor: "ATX", dimensions });

    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.x).toBeCloseTo(mm(dimensions.width), 5);
    expect(size.y).toBeCloseTo(mm(dimensions.height), 5);
    expect(size.z).toBeCloseTo(mm(dimensions.depth), 5);
  });

  it("produces a different size for different dimensions", () => {
    const small = createGenericCase({
      formFactor: "Mini-ITX",
      dimensions: { width: 180, height: 350, depth: 350 },
    });
    const large = createGenericCase({
      formFactor: "E-ATX",
      dimensions: { width: 230, height: 500, depth: 500 },
    });

    const smallSize = new Box3().setFromObject(small).getSize(new Vector3());
    const largeSize = new Box3().setFromObject(large).getSize(new Vector3());
    expect(largeSize.y).toBeGreaterThan(smallSize.y);
  });
});
