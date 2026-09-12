import { describe, expect, it } from "vitest";
import { Box3, Group, Vector3 } from "three";
import { createGenericCpu } from "../src/procedural/createGenericCpu";
import { mm } from "../src/procedural/units";

describe("createGenericCpu", () => {
  it("returns a Group", () => {
    expect(createGenericCpu({ socket: "AM5" })).toBeInstanceOf(Group);
  });

  it("sizes the IHS to a ~40mm square regardless of socket", () => {
    const am5 = new Box3().setFromObject(createGenericCpu({ socket: "AM5" })).getSize(new Vector3());
    const lga1700 = new Box3()
      .setFromObject(createGenericCpu({ socket: "LGA1700" }))
      .getSize(new Vector3());

    expect(am5.x).toBeCloseTo(mm(40), 5);
    expect(am5.z).toBeCloseTo(mm(40), 5);
    expect(lga1700.x).toBeCloseTo(am5.x, 5);
    expect(lga1700.z).toBeCloseTo(am5.z, 5);
  });
});
