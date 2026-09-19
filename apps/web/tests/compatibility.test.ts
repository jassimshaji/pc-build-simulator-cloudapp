import { describe, expect, it } from "vitest";
import { POST as checkCompatibility } from "@/app/api/compatibility/check/route";
import { componentBySku, jsonRequest, readJson } from "./helpers";

async function check(skus: string[]) {
  const selections = await Promise.all(
    skus.map(async (sku) => ({ componentId: (await componentBySku(sku)).id, quantity: 1 })),
  );
  const response = await checkCompatibility(jsonRequest("POST", { selections }));
  return { response, report: (await readJson(response)).data };
}

const failed = (report: any, ruleKey: string) =>
  report.results.some((result: any) => result.ruleKey === ruleKey && result.compatible === false);

describe("POST /api/compatibility/check", () => {
  it("is public (needs no session) and reports OK for a matching CPU + motherboard", async () => {
    const { response, report } = await check(["CPU-AMD-7800X3D", "MB-ASUS-B650A"]);
    expect(response.status).toBe(200);
    expect(failed(report, "cpuSocket")).toBe(false);
    expect(report.overallStatus).not.toBe("ERROR");
  });

  it("flags a CPU/motherboard socket mismatch as an ERROR", async () => {
    const { report } = await check(["CPU-AMD-7800X3D", "MB-MSI-B760M"]); // AM5 CPU on an LGA1700 board
    expect(failed(report, "cpuSocket")).toBe(true);
    expect(report.overallStatus).toBe("ERROR");
    const socketResult = report.results.find((result: any) => result.ruleKey === "cpuSocket");
    expect(socketResult.severity).toBe("ERROR");
    expect(socketResult.affectedComponents.length).toBeGreaterThan(0);
  });

  it("flags DDR4 RAM on a DDR5 motherboard", async () => {
    const { report } = await check(["MB-ASUS-B650A", "RAM-CORSAIR-VENGEANCE-16GB-DDR4"]);
    expect(failed(report, "ramTypeMatch")).toBe(true);
    expect(report.overallStatus).toBe("ERROR");
  });

  it("flags a GPU that is too long for the case", async () => {
    const { report } = await check(["CASE-NZXT-H1", "GPU-ASUS-RTX4090"]); // 358mm card, 305mm limit
    expect(failed(report, "gpuLengthClearance")).toBe(true);
  });

  it("flags a motherboard the case cannot fit", async () => {
    const { report } = await check(["CASE-NZXT-H1", "MB-ASUS-B650A"]); // ATX board in a Mini-ITX-only case
    expect(failed(report, "caseFormFactor")).toBe(true);
  });

  it("flags an undersized PSU and estimates power draw", async () => {
    const { report } = await check(["CPU-AMD-7800X3D", "GPU-ASUS-RTX4090", "PSU-CORSAIR-CV450"]);
    expect(failed(report, "psuWattage")).toBe(true);
    expect(report.estimatedPowerWatts).toBeGreaterThan(450);
    expect(report.recommendedPsuWattage).toBeGreaterThan(report.estimatedPowerWatts);
  });

  it("accepts an adequate PSU for the same parts", async () => {
    const { report } = await check(["CPU-AMD-7800X3D", "GPU-NVIDIA-RTX4070", "PSU-SEASONIC-FOCUS-850"]);
    expect(failed(report, "psuWattage")).toBe(false);
  });

  it("counts quantity toward power and skips unknown ids and non-modelled categories", async () => {
    const monitor = await componentBySku("MON-LG-27GP850");
    const cpu = await componentBySku("CPU-AMD-7800X3D");
    const response = await checkCompatibility(
      jsonRequest("POST", {
        selections: [
          { componentId: cpu.id, quantity: 1 },
          { componentId: monitor.id },
          { componentId: "does-not-exist" },
        ],
      }),
    );
    expect(response.status).toBe(200);
    expect((await readJson(response)).data.estimatedPowerWatts).toBeGreaterThan(0);
  });

  it("returns an OK report for an empty selection and 400 for malformed input", async () => {
    const empty = await checkCompatibility(jsonRequest("POST", { selections: [] }));
    expect(empty.status).toBe(200);
    expect((await readJson(empty)).data.overallStatus).toBe("OK");

    for (const body of [{}, { selections: [{}] }, { selections: "x" }]) {
      expect((await checkCompatibility(jsonRequest("POST", body))).status).toBe(400);
    }
  });
});
