import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericMonitor } from "../src/procedural/createGenericMonitor";

describe("createGenericMonitor", () => {
  it("returns a Group", () => {
    expect(createGenericMonitor({ screenSizeInches: 27 })).toBeInstanceOf(Group);
  });

  it("derives a 16:9 panel from the screen diagonal", () => {
    const result = createGenericMonitor({ screenSizeInches: 27 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    // 27" diagonal at 16:9 -> ~598mm x ~336mm panel (0.598 x 0.336 scene units)
    expect(size.x).toBeCloseTo(0.598, 2);
  });

  it("sizes a larger screen wider than a smaller one", () => {
    const small = new Box3()
      .setFromObject(createGenericMonitor({ screenSizeInches: 24 }))
      .getSize(new Vector3());
    const large = new Box3()
      .setFromObject(createGenericMonitor({ screenSizeInches: 32 }))
      .getSize(new Vector3());
    expect(large.x).toBeGreaterThan(small.x);
  });

  it("includes a stand base that reaches the ground (y=0), below the panel", () => {
    const result = createGenericMonitor({ screenSizeInches: 27 });
    const box = new Box3().setFromObject(result);
    // Without a stand, the group's lowest point would be the panel's own
    // bottom edge (well above 0); the stand base's bottom sits at y=0.
    expect(box.min.y).toBeCloseTo(0, 3);
  });
});
