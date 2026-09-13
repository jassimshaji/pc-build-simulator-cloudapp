import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericAirCooler } from "../src/procedural/createGenericAirCooler";
import { mm } from "../src/procedural/units";

describe("createGenericAirCooler", () => {
  it("returns a Group", () => {
    expect(createGenericAirCooler({ heightMm: 160 })).toBeInstanceOf(Group);
  });

  it("sizes the tower's height to heightMm and uses default width/depth when absent", () => {
    const result = createGenericAirCooler({ heightMm: 160 });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.y).toBeCloseTo(mm(160), 5);
    expect(size.x).toBeCloseTo(mm(130), 5);
  });

  it("uses given dimensionsMm instead of the defaults", () => {
    const result = createGenericAirCooler({ heightMm: 160, dimensionsMm: { width: 150, depth: 70 } });
    const size = new Box3().setFromObject(result).getSize(new Vector3());
    expect(size.x).toBeCloseTo(mm(150), 5);
  });

  it("includes a mounted fan that extends the bounding box past the tower depth", () => {
    const towerOnly = mm(65); // default depth
    const result = createGenericAirCooler({ heightMm: 160 });
    const box = new Box3().setFromObject(result);
    const size = box.getSize(new Vector3());
    expect(size.z).toBeGreaterThan(towerOnly);
  });

  it("uses a given fanSizeMm for the mounted fan", () => {
    // Default tower width is 130mm — a 140mm fan is wider than the tower and
    // should widen the overall bounding box; a 120mm fan (narrower than the
    // tower) should not.
    const narrowerFan = new Box3()
      .setFromObject(createGenericAirCooler({ heightMm: 160, fanSizeMm: 120 }))
      .getSize(new Vector3());
    const widerFan = new Box3()
      .setFromObject(createGenericAirCooler({ heightMm: 160, fanSizeMm: 140 }))
      .getSize(new Vector3());
    expect(widerFan.x).toBeGreaterThan(narrowerFan.x);
  });
});
