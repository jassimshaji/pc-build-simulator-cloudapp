import { describe, expect, it } from "vitest";
import { checkCaseFormFactor } from "../src/rules/caseFormFactor";
import { build, component } from "./helpers";

describe("checkCaseFormFactor", () => {
  it("returns null when the motherboard is missing", () => {
    const pcCase = component("CASE", {
      specifications: { supportedMotherboardFormFactors: ["ATX"] },
    });
    expect(checkCaseFormFactor(build(pcCase))).toBeNull();
  });

  it("returns null when the case is missing", () => {
    const motherboard = component("MOTHERBOARD", { hotFields: { formFactor: "ATX" } });
    expect(checkCaseFormFactor(build(motherboard))).toBeNull();
  });

  it("is compatible when the case supports the motherboard's form factor", () => {
    const motherboard = component("MOTHERBOARD", { hotFields: { formFactor: "Micro-ATX" } });
    const pcCase = component("CASE", {
      specifications: { supportedMotherboardFormFactors: ["ATX", "Micro-ATX", "Mini-ITX"] },
    });
    const result = checkCaseFormFactor(build(motherboard, pcCase));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is an ERROR when the case does not support the motherboard's form factor", () => {
    const motherboard = component("MOTHERBOARD", { hotFields: { formFactor: "E-ATX" } });
    const pcCase = component("CASE", {
      specifications: { supportedMotherboardFormFactors: ["Mini-ITX"] },
    });
    const result = checkCaseFormFactor(build(motherboard, pcCase));
    expect(result).toMatchObject({
      compatible: false,
      severity: "ERROR",
      affectedComponents: ["MOTHERBOARD", "CASE"],
    });
  });
});
