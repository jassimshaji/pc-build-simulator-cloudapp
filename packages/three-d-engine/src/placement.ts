import type { Group as ThreeGroup } from "three";
import {
  createGenericAio,
  createGenericAirCooler,
  createGenericCaseLcd,
  createGenericCpu,
  createGenericFan,
  createGenericGpu,
  createGenericMonitor,
  createGenericMotherboard,
  createGenericPsu,
  createGenericRam,
  createGenericSsd,
  type MotherboardFormFactor,
} from "./procedural";
import type { CaseZoneSpec } from "./zones/generateCaseZones";
import type { MotherboardZoneSpec } from "./zones/generateMotherboardZones";

const MOTHERBOARD_FORM_FACTORS: readonly MotherboardFormFactor[] = [
  "ATX",
  "Micro-ATX",
  "Mini-ITX",
  "E-ATX",
];

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

// Reads the fields generateCaseZones needs straight out of a Component's
// JSONB `specifications` (untyped by the time it reaches here — already
// validated once at write time by component-models, but that guarantee
// doesn't reach this package's types). Returns null when a component that
// isn't really a valid case spec gets passed in (e.g. `dimensionsMm` missing)
// rather than throwing — the caller just doesn't render a 3D case that turn.
export function extractCaseZoneSpec(specifications: Record<string, unknown>): CaseZoneSpec | null {
  const dims = specifications.dimensionsMm as
    | { width?: unknown; height?: unknown; depth?: unknown }
    | undefined;
  if (
    !dims ||
    typeof dims.width !== "number" ||
    typeof dims.height !== "number" ||
    typeof dims.depth !== "number"
  ) {
    return null;
  }

  return {
    dimensions: { width: dims.width, height: dims.height, depth: dims.depth },
    maxGpuLengthMm: numberOr(specifications.maxGpuLengthMm, 380),
    maxCpuCoolerHeightMm: numberOr(specifications.maxCpuCoolerHeightMm, 165),
    driveBays: specifications.driveBays as Record<string, number> | undefined,
    fanSupportMm: specifications.fanSupportMm as number[] | undefined,
    radiatorSupport: specifications.radiatorSupport as string[] | undefined,
  };
}

// Same idea for the fields generateMotherboardZones needs. Unlike the case
// (which has several optional array fields), every motherboard slot count is
// required by component-models' own schema — so this only returns null for
// genuinely malformed data, not an expected "optional field absent" case.
export function extractMotherboardZoneSpec(
  specifications: Record<string, unknown>,
): MotherboardZoneSpec | null {
  const { ramSlots, pcieSlots, m2Slots, sataPorts } = specifications;
  if (
    typeof ramSlots !== "number" ||
    typeof pcieSlots !== "number" ||
    typeof m2Slots !== "number" ||
    typeof sataPorts !== "number"
  ) {
    return null;
  }
  return { ramSlots, pcieSlots, m2Slots, sataPorts };
}

// Builds a placed component's own 3D model from its real specifications.
// Every one of the 12 component categories has a procedural generator as of
// Milestone 5 (Milestone 2 covered Case/Motherboard/CPU/GPU/RAM/PSU;
// Milestone 5 added Fan/Radiator/AIO/Air Cooler/SSD/Monitor/Case LCD), so
// this always returns a model — the `default: null` branch below is
// unreachable for any real `categoryKey` but kept as a safe fallback for
// data that doesn't match any known category. A few fields these generators
// want aren't in the component-models schema (GPU fan count, RAM module
// height, PSU length, AIR_COOLER's fan size are all sometimes absent) —
// approximated with a documented fallback constant rather than left
// undefined.
export function buildGenericModel(
  categoryKey: string,
  specifications: Record<string, unknown>,
): ThreeGroup | null {
  switch (categoryKey) {
    case "MOTHERBOARD": {
      const formFactor = MOTHERBOARD_FORM_FACTORS.includes(specifications.formFactor as MotherboardFormFactor)
        ? (specifications.formFactor as MotherboardFormFactor)
        : "ATX";
      return createGenericMotherboard({ formFactor });
    }
    case "CPU": {
      const socket = typeof specifications.socket === "string" ? specifications.socket : "UNKNOWN";
      return createGenericCpu({ socket });
    }
    case "GPU": {
      return createGenericGpu({
        length: numberOr(specifications.lengthMm, 280),
        width: numberOr(specifications.widthMm, 40),
        height: numberOr(specifications.heightMm, 120),
        slotWidth: numberOr(specifications.slotWidth, 2),
        // Not tracked by the GPU spec schema — approximated.
        fanCount: 2,
      });
    }
    case "RAM": {
      const formFactor = specifications.formFactor === "SODIMM" ? "SODIMM" : "UDIMM";
      // Module height above the slot isn't tracked by the RAM spec schema —
      // approximated with a typical heatspreader height.
      return createGenericRam({ formFactor, height: 34 });
    }
    case "PSU": {
      const formFactor =
        specifications.formFactor === "SFX" || specifications.formFactor === "SFX-L"
          ? specifications.formFactor
          : "ATX";
      const dims = specifications.dimensionsMm as { length?: unknown } | undefined;
      return createGenericPsu({ formFactor, length: numberOr(dims?.length, 160) });
    }
    case "FAN": {
      return createGenericFan({
        sizeMm: numberOr(specifications.sizeMm, 120),
        thicknessMm: typeof specifications.thicknessMm === "number" ? specifications.thicknessMm : undefined,
      });
    }
    case "AIR_COOLER": {
      const dims = specifications.dimensionsMm as { width?: unknown; depth?: unknown } | undefined;
      return createGenericAirCooler({
        heightMm: numberOr(specifications.heightMm, 160),
        fanSizeMm: typeof specifications.fanSizeMm === "number" ? specifications.fanSizeMm : undefined,
        dimensionsMm:
          dims && typeof dims.width === "number" && typeof dims.depth === "number"
            ? { width: dims.width, depth: dims.depth }
            : undefined,
      });
    }
    case "AIO_COOLER": {
      return createGenericAio({ radiatorSizeMm: numberOr(specifications.radiatorSizeMm, 240) });
    }
    case "SSD": {
      const formFactor =
        specifications.formFactor === "SATA 2.5\"" || specifications.formFactor === "M.2 SATA"
          ? specifications.formFactor
          : "M.2 NVMe";
      return createGenericSsd({ formFactor });
    }
    case "MONITOR": {
      return createGenericMonitor({ screenSizeInches: numberOr(specifications.screenSizeInches, 27) });
    }
    case "CASE_LCD": {
      return createGenericCaseLcd({ displaySizeInches: numberOr(specifications.displaySizeInches, 5) });
    }
    default:
      return null;
  }
}
