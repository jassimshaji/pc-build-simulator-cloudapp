import { PrismaClient } from "@prisma/client";
import { extractHotFields, validateSpecifications } from "@pcbuilder/component-models";

const prisma = new PrismaClient();

// Full category list from the project brief. Seeding every category as a data
// row now (even ones with zero components yet) is what makes "add a new
// category" a data change later, not a migration — see ARCHITECTURE.md §4.3.
const CATEGORIES = [
  { key: "CPU", label: "CPU", sortOrder: 10 },
  { key: "MOTHERBOARD", label: "Motherboard", sortOrder: 20 },
  { key: "GPU", label: "Graphics Card", sortOrder: 30 },
  { key: "RAM", label: "RAM", sortOrder: 40 },
  { key: "SSD", label: "SSD", sortOrder: 50 },
  { key: "PSU", label: "Power Supply", sortOrder: 60 },
  { key: "CASE", label: "PC Case", sortOrder: 70 },
  { key: "AIR_COOLER", label: "Air Cooler", sortOrder: 80 },
  { key: "AIO_COOLER", label: "AIO Liquid Cooler", sortOrder: 90 },
  { key: "FAN", label: "Cooling Fan", sortOrder: 100 },
  { key: "MONITOR", label: "Monitor", sortOrder: 110 },
  { key: "CASE_LCD", label: "Case LCD Display", sortOrder: 120 },
] as const;

const BRANDS = [
  "AMD",
  "Intel",
  "NVIDIA",
  "ASUS",
  "Corsair",
  "NZXT",
  "Seasonic",
  "Samsung",
] as const;

// Compatibility rules registered as admin-visible data. The actual comparison
// logic lives in packages/compatibility-engine (Phase 3), not here.
const COMPATIBILITY_RULES = [
  { key: "CPU_SOCKET_MATCH", description: "CPU socket must match motherboard socket.", severity: "ERROR" },
  { key: "RAM_TYPE_MATCH", description: "RAM type must match motherboard-supported RAM type.", severity: "ERROR" },
  { key: "RAM_CAPACITY_LIMIT", description: "Installed RAM capacity must not exceed motherboard maximum.", severity: "ERROR" },
  { key: "GPU_LENGTH_VS_CASE", description: "GPU length must not exceed case maximum GPU length.", severity: "ERROR" },
  { key: "CASE_FORM_FACTOR", description: "Motherboard form factor must be supported by the case.", severity: "ERROR" },
  { key: "PSU_WATTAGE", description: "PSU wattage must meet or exceed estimated system power plus headroom.", severity: "ERROR" },
  { key: "COOLING_SOCKET_MATCH", description: "CPU cooler must support the CPU socket.", severity: "ERROR" },
  { key: "COOLING_CASE_CLEARANCE", description: "CPU cooler height must not exceed case clearance.", severity: "WARNING" },
] as const;

// `specifications` is the single source of truth per component — every field
// its category's Zod schema requires must be present here (this is what
// POST /api/components enforces for real admin-entered data too). Hot
// columns (socket, tdpWatts, etc.) are DERIVED below via extractHotFields,
// never hand-duplicated — an earlier version of this file set them as
// separate literals here, which drifted out of sync with the schemas added
// in a later milestone and broke CSV re-import for exactly these rows
// (discovered via the Phase 2, Milestone 5 CSV round-trip test).
const components = [
  {
    sku: "CPU-AMD-7800X3D",
    categoryKey: "CPU",
    brandName: "AMD",
    model: "Ryzen 7 7800X3D",
    price: "449.00",
    description: "8-core/16-thread AM5 CPU with 3D V-Cache, strong gaming performance.",
    specifications: {
      socket: "AM5",
      architecture: "Zen 4",
      coreCount: 8,
      threadCount: 16,
      baseClockGhz: 4.2,
      boostClockGhz: 5.0,
      cacheMb: 96,
      tdpWatts: 120,
      integratedGraphics: "AMD Radeon Graphics",
      memorySupport: ["DDR5"],
      pcieGeneration: "5.0",
    },
    generator: "createGenericCPU",
  },
  {
    sku: "CPU-INTEL-13600K",
    categoryKey: "CPU",
    brandName: "Intel",
    model: "Core i5-13600K",
    price: "319.00",
    description: "14-core (6P+8E) LGA1700 CPU, strong price-to-performance.",
    specifications: {
      socket: "LGA1700",
      architecture: "Raptor Lake",
      coreCount: 14,
      threadCount: 20,
      baseClockGhz: 3.5,
      boostClockGhz: 5.1,
      cacheMb: 24,
      tdpWatts: 125,
      integratedGraphics: "Intel UHD Graphics 770",
      memorySupport: ["DDR4", "DDR5"],
      pcieGeneration: "5.0",
    },
    generator: "createGenericCPU",
  },
  {
    sku: "MB-ASUS-B650A",
    categoryKey: "MOTHERBOARD",
    brandName: "ASUS",
    model: "ROG STRIX B650-A GAMING WIFI",
    price: "229.00",
    description: "ATX AM5 motherboard with WiFi 6E and PCIe 4.0.",
    specifications: {
      socket: "AM5",
      chipset: "B650",
      formFactor: "ATX",
      ramSlots: 4,
      maxRamGb: 128,
      ramType: "DDR5",
      pcieSlots: 3,
      pcieGeneration: "4.0",
      m2Slots: 4,
      sataPorts: 4,
      usbHeaders: 6,
      rgbHeaders: 2,
      cpuPowerConnectors: "8+4 pin",
      wifi: "WiFi 6E",
      bluetooth: "5.3",
      audio: "Realtek ALC4080",
      dimensionsMm: { width: 305, depth: 244 },
    },
    generator: "createGenericMotherboard",
  },
  {
    sku: "GPU-NVIDIA-RTX4070",
    categoryKey: "GPU",
    brandName: "NVIDIA",
    model: "GeForce RTX 4070",
    price: "549.00",
    description: "12GB GDDR6X GPU with DLSS 3 support.",
    specifications: {
      gpuArchitecture: "Ada Lovelace",
      vramCapacityGb: 12,
      vramType: "GDDR6X",
      memoryBusBit: 192,
      coreClockMhz: 1920,
      boostClockMhz: 2475,
      powerDrawWatts: 200,
      recommendedPsuWattage: 650,
      powerConnectors: "1x 16-pin",
      pcieGeneration: "4.0",
      rayTracingSupport: true,
      dlss: "DLSS 3",
      displayOutputs: ["3x DisplayPort 1.4a", "1x HDMI 2.1"],
      lengthMm: 242,
      widthMm: 112,
      heightMm: 40,
      slotWidth: 2,
      coolingType: "Triple fan",
    },
    generator: "createGenericGPU",
  },
  {
    sku: "RAM-CORSAIR-VENGEANCE-32GB-DDR5",
    categoryKey: "RAM",
    brandName: "Corsair",
    model: "Vengeance DDR5-6000 32GB (2x16GB)",
    price: "109.00",
    description: "32GB DDR5 kit, 2 modules, aluminum heat spreader.",
    specifications: {
      memoryCapacityGb: 32,
      numberOfModules: 2,
      memoryType: "DDR5",
      speedMtS: 6000,
      casLatency: 36,
      voltage: 1.35,
      formFactor: "UDIMM",
      rgb: false,
    },
    generator: "createGenericRAM",
  },
  {
    sku: "PSU-SEASONIC-FOCUS-850",
    categoryKey: "PSU",
    brandName: "Seasonic",
    model: "Focus GX-850",
    price: "139.00",
    description: "850W 80 PLUS Gold fully modular ATX PSU.",
    specifications: {
      wattage: 850,
      efficiencyCertification: "80 PLUS Gold",
      modularType: "Full",
      formFactor: "ATX",
      atxStandard: "ATX 3.0",
      pciePowerConnectors: 4,
      cpuPowerConnectors: 2,
      sataConnectors: 8,
      molexConnectors: 4,
      fanSizeMm: 135,
      dimensionsMm: { length: 140 },
    },
    generator: "createGenericPSU",
  },
  {
    sku: "CASE-NZXT-H510",
    categoryKey: "CASE",
    brandName: "NZXT",
    model: "H510",
    price: "89.00",
    description: "Compact ATX mid-tower case with tempered glass panel.",
    specifications: {
      caseType: "Mid Tower",
      supportedMotherboardFormFactors: ["ATX", "Micro-ATX", "Mini-ITX"],
      maxGpuLengthMm: 381,
      maxCpuCoolerHeightMm: 165,
      radiatorSupport: ["240mm front", "280mm front"],
      fanSupportMm: [120, 140],
      psuSupport: "ATX",
      driveBays: { "3.5in": 2, "2.5in": 2 },
      frontIo: ["USB-C", "USB-A", "3.5mm audio"],
      dimensionsMm: { height: 460, width: 210, depth: 428 },
      glassPanels: 1,
      rgbSupport: false,
      includedFans: 2,
    },
    generator: "createGenericCase",
  },
] as const;

async function main() {
  const categories = new Map<string, string>();
  for (const category of CATEGORIES) {
    const row = await prisma.componentCategory.upsert({
      where: { key: category.key },
      update: { label: category.label, sortOrder: category.sortOrder },
      create: category,
    });
    categories.set(category.key, row.id);
  }

  const brands = new Map<string, string>();
  for (const name of BRANDS) {
    const row = await prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    brands.set(name, row.id);
  }

  for (const rule of COMPATIBILITY_RULES) {
    await prisma.compatibilityRule.upsert({
      where: { key: rule.key },
      update: { description: rule.description, severity: rule.severity },
      create: rule,
    });
  }

  for (const component of components) {
    const categoryId = categories.get(component.categoryKey);
    const brandId = brands.get(component.brandName);
    if (!categoryId || !brandId) {
      throw new Error(`Missing category/brand for seed component ${component.sku}`);
    }

    const specResult = validateSpecifications(component.categoryKey, component.specifications);
    if (!specResult.success) {
      throw new Error(
        `Seed specifications for ${component.sku} don't match its own schema: ${JSON.stringify(specResult.error.flatten().fieldErrors)}`,
      );
    }
    const hotFields = extractHotFields(component.categoryKey, specResult.data);

    // `update` mirrors `create` (rather than being a no-op) so re-running the
    // seed against an existing database — e.g. after fixing a seed data bug —
    // actually corrects already-seeded rows instead of silently skipping them.
    const componentData = {
      categoryId,
      brandId,
      model: component.model,
      price: component.price,
      description: component.description,
      specifications: specResult.data,
      ...hotFields,
    };

    const created = await prisma.component.upsert({
      where: { sku: component.sku },
      update: componentData,
      create: { sku: component.sku, images: [], ...componentData },
    });

    await prisma.inventory.upsert({
      where: { componentId: created.id },
      update: {},
      create: { componentId: created.id, stockQuantity: 25, lowStockThreshold: 5 },
    });

    await prisma.threeDAsset.upsert({
      where: { id: `seed-asset-${created.sku}` },
      update: {},
      create: {
        id: `seed-asset-${created.sku}`,
        componentId: created.id,
        kind: "PROCEDURAL_FALLBACK",
        proceduralGeneratorKey: component.generator,
        source: "procedural",
      },
    });
  }

  console.log(`Seeded ${categories.size} categories, ${brands.size} brands, ${components.length} components.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
