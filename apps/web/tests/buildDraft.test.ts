import { describe, expect, it } from "vitest";
import {
  addToLines,
  isLinePlaced,
  lineFromComponent,
  placementFromComponent,
  removeFromLines,
  removePlacementsOf,
} from "@/lib/buildDraft";
import type { ComponentSummary } from "@/types/workspace";

function component(id: string, categoryKey: string, price = "10.00"): ComponentSummary {
  return {
    id,
    model: `Model ${id}`,
    price,
    specifications: { k: id },
    category: { key: categoryKey, label: categoryKey },
    brand: { name: "Brand" },
    threeDAssets: [{ kind: "PROCEDURAL_FALLBACK", url: null }],
  };
}

describe("buildDraft", () => {
  it("builds a line from a component with a numeric unit price and its first asset", () => {
    const line = lineFromComponent(component("a", "CPU", "449.00"));
    expect(line).toMatchObject({ componentId: "a", categoryKey: "CPU", quantity: 1, price: 449 });
    expect(line.asset).toEqual({ kind: "PROCEDURAL_FALLBACK", url: null });
    expect(lineFromComponent({ ...component("b", "CPU"), threeDAssets: [] }).asset).toBeUndefined();
  });

  it("adds a new line, and bumps the quantity of an existing one without reordering", () => {
    const cpu = component("cpu", "CPU");
    const ram = component("ram", "RAM");

    let lines = addToLines([], cpu);
    lines = addToLines(lines, ram);
    lines = addToLines(lines, ram);

    expect(lines.map((line) => [line.componentId, line.quantity])).toEqual([
      ["cpu", 1],
      ["ram", 2],
    ]);
  });

  it("does not mutate the lines it is given", () => {
    const original = addToLines([], component("cpu", "CPU"));
    const frozen = JSON.stringify(original);
    addToLines(original, component("cpu", "CPU"));
    removeFromLines(original, "cpu");
    expect(JSON.stringify(original)).toBe(frozen);
  });

  it("removes a line entirely, whatever its quantity", () => {
    const ram = component("ram", "RAM");
    const lines = addToLines(addToLines(addToLines([], component("cpu", "CPU")), ram), ram);
    expect(removeFromLines(lines, "ram").map((line) => line.componentId)).toEqual(["cpu"]);
    expect(removeFromLines(lines, "unknown")).toHaveLength(2);
  });

  it("removing a component frees every zone it occupied", () => {
    const ram = placementFromComponent(component("ram", "RAM"));
    const gpu = placementFromComponent(component("gpu", "GPU"));
    const placements = { RAM_SLOT_1: ram, RAM_SLOT_2: ram, EXPANSION_SLOT_1: gpu };
    expect(Object.keys(removePlacementsOf(placements, "ram"))).toEqual(["EXPANSION_SLOT_1"]);
  });

  it("treats the case as always placed and others only when they occupy a zone", () => {
    const caseLine = lineFromComponent(component("case", "CASE"));
    const cpuLine = lineFromComponent(component("cpu", "CPU"));
    const placements = { CPU_SOCKET: placementFromComponent(component("cpu", "CPU")) };

    expect(isLinePlaced(caseLine, {})).toBe(true);
    expect(isLinePlaced(cpuLine, {})).toBe(false);
    expect(isLinePlaced(cpuLine, placements)).toBe(true);
  });
});
