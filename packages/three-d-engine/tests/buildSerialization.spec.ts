import { describe, expect, it } from "vitest";
import { UNPLACED_ZONE_KEY, deserializeBuild, serializeBuild } from "../src/buildSerialization";

describe("serializeBuild", () => {
  it("emits one row per unit, zone-keyed when placed and UNPLACED otherwise", () => {
    const rows = serializeBuild(
      [
        { componentId: "case", quantity: 1 },
        { componentId: "ram", quantity: 3 },
      ],
      { RAM_SLOT_1: { componentId: "ram" }, RAM_SLOT_2: { componentId: "ram" } },
    );

    expect(rows.filter((r) => r.installedZoneKey === "RAM_SLOT_1")).toHaveLength(1);
    expect(rows.filter((r) => r.installedZoneKey === "RAM_SLOT_2")).toHaveLength(1);
    expect(rows.filter((r) => r.componentId === "ram" && r.installedZoneKey === UNPLACED_ZONE_KEY)).toHaveLength(1);
    expect(rows.filter((r) => r.componentId === "case")).toEqual([
      { componentId: "case", installedZoneKey: UNPLACED_ZONE_KEY },
    ]);
    expect(rows).toHaveLength(4);
  });

  it("never emits negative unplaced rows if placements exceed quantity", () => {
    const rows = serializeBuild([{ componentId: "gpu", quantity: 0 }], {
      PCIE_SLOT_1: { componentId: "gpu" },
    });
    expect(rows).toEqual([{ componentId: "gpu", installedZoneKey: "PCIE_SLOT_1" }]);
  });

  it("returns no rows for an empty build", () => {
    expect(serializeBuild([], {})).toEqual([]);
  });
});

describe("deserializeBuild", () => {
  it("groups rows into quantities and rebuilds the placement map", () => {
    const result = deserializeBuild([
      { componentId: "mobo", installedZoneKey: "MOBO_TRAY" },
      { componentId: "ram", installedZoneKey: "RAM_SLOT_1" },
      { componentId: "ram", installedZoneKey: UNPLACED_ZONE_KEY },
    ]);

    expect(result.lines).toEqual([
      { componentId: "mobo", quantity: 1 },
      { componentId: "ram", quantity: 2 },
    ]);
    expect(result.placements).toEqual({ MOBO_TRAY: "mobo", RAM_SLOT_1: "ram" });
  });

  it("round-trips through serializeBuild", () => {
    const lines = [
      { componentId: "case", quantity: 1 },
      { componentId: "ram", quantity: 2 },
    ];
    const placements = { RAM_SLOT_1: { componentId: "ram" } };
    const result = deserializeBuild(serializeBuild(lines, placements));

    expect(result.lines).toEqual(expect.arrayContaining(lines));
    expect(result.lines).toHaveLength(2);
    expect(result.placements).toEqual({ RAM_SLOT_1: "ram" });
  });
});
