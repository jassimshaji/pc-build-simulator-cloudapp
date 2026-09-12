import { describe, expect, it } from "vitest";
import { Box3, CylinderGeometry, Group, Mesh, Vector3 } from "three";
import { createGenericGpu } from "../src/procedural/createGenericGpu";
import { mm } from "../src/procedural/units";

describe("createGenericGpu", () => {
  const params = { length: 300, width: 40, height: 120, slotWidth: 2, fanCount: 3 };

  it("returns a Group", () => {
    expect(createGenericGpu(params)).toBeInstanceOf(Group);
  });

  it("sizes the card body to the given length/width/height", () => {
    const result = createGenericGpu(params);
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    // The bounding box includes the fan cylinders, which sit flush against or
    // just past the front face — so length/height should match exactly
    // (nothing extends past the card's ends or top/bottom), while depth (z)
    // may be very slightly larger than the bare card width because the fans
    // protrude a hair past the front face.
    expect(size.x).toBeCloseTo(mm(params.length), 5);
    expect(size.y).toBeCloseTo(mm(params.height), 5);
    expect(size.z).toBeGreaterThanOrEqual(mm(params.width));
  });

  it("adds one fan mesh per fanCount", () => {
    const result = createGenericGpu(params);
    const fanMeshes = result.children.filter(
      (child) => child instanceof Mesh && child.geometry instanceof CylinderGeometry,
    );
    expect(fanMeshes).toHaveLength(params.fanCount);
  });

  it("adds no fan meshes when fanCount is 0", () => {
    const result = createGenericGpu({ ...params, fanCount: 0 });
    const fanMeshes = result.children.filter(
      (child) => child instanceof Mesh && child.geometry instanceof CylinderGeometry,
    );
    expect(fanMeshes).toHaveLength(0);
  });
});
