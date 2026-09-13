import { describe, expect, it } from "vitest";
import { composeZone } from "../src/zones/composeZone";
import type { InstallationZone } from "../src/zones/types";

describe("composeZone", () => {
  const zone: InstallationZone = {
    key: "RAM_SLOT_1",
    acceptsCategory: "RAM",
    position: [0.07, 0, -0.07],
    rotation: [0, 0, 0],
  };

  it("offsets the zone's position by the given origin", () => {
    const composed = composeZone(zone, [1, 2, 3]);
    expect(composed.position).toEqual([1.07, 2, 2.93]);
  });

  it("leaves every other field unchanged", () => {
    const composed = composeZone(zone, [1, 2, 3]);
    expect(composed.key).toBe(zone.key);
    expect(composed.acceptsCategory).toBe(zone.acceptsCategory);
    expect(composed.rotation).toEqual(zone.rotation);
  });

  it("is a no-op with a zero origin", () => {
    const composed = composeZone(zone, [0, 0, 0]);
    expect(composed.position).toEqual(zone.position);
  });

  it("does not mutate the input zone", () => {
    const original = { ...zone, position: [...zone.position] as [number, number, number] };
    composeZone(zone, [5, 5, 5]);
    expect(zone).toEqual(original);
  });
});
