import { describe, expect, it } from "vitest";
import { checkCpuSocket } from "../src/rules/cpuSocket";
import { build, component } from "./helpers";

describe("checkCpuSocket", () => {
  it("returns null when the CPU is missing", () => {
    const result = checkCpuSocket(build(component("MOTHERBOARD", { hotFields: { socket: "AM5" } })));
    expect(result).toBeNull();
  });

  it("returns null when the motherboard is missing", () => {
    const result = checkCpuSocket(build(component("CPU", { hotFields: { socket: "AM5" } })));
    expect(result).toBeNull();
  });

  it("is compatible when sockets match", () => {
    const result = checkCpuSocket(
      build(
        component("CPU", { hotFields: { socket: "AM5" } }),
        component("MOTHERBOARD", { hotFields: { socket: "AM5" } }),
      ),
    );
    expect(result).toMatchObject({ compatible: true, severity: "INFO", ruleKey: "cpuSocket" });
  });

  it("is an ERROR when sockets mismatch", () => {
    const result = checkCpuSocket(
      build(
        component("CPU", { hotFields: { socket: "AM5" } }),
        component("MOTHERBOARD", { hotFields: { socket: "LGA1700" } }),
      ),
    );
    expect(result).toMatchObject({
      compatible: false,
      severity: "ERROR",
      ruleKey: "cpuSocket",
      affectedComponents: ["CPU", "MOTHERBOARD"],
    });
  });
});
