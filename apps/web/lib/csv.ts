// CSV shape for bulk inventory import/export (Phase 2, Milestone 5).
//
// `specifications` and `images` vary per category / are arrays, so — rather
// than inventing a bespoke per-field-column CSV schema that would need to
// change every time a category's spec shape changes — both are stored as a
// single JSON-encoded string per cell. This mirrors exactly what the JSON API
// (`POST /api/components`) already accepts for these fields, so a row that
// round-trips through export → edit → import goes through the same
// validation path (`@pcbuilder/component-models`'s `validateSpecifications`)
// either way.

export const CSV_COLUMNS = [
  "sku",
  "categoryKey",
  "brandName",
  "model",
  "price",
  "description",
  "images",
  "isAvailable",
  "stockQuantity",
  "lowStockThreshold",
  "specifications",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];
export type CsvRow = Record<CsvColumn, string>;

interface ComponentForExport {
  sku: string;
  category: { key: string };
  brand: { name: string };
  model: string;
  price: unknown; // Prisma.Decimal — stringified either way
  description: string | null;
  images: string[];
  isAvailable: boolean;
  inventory: { stockQuantity: number; lowStockThreshold: number } | null;
  specifications: unknown;
}

export function componentToCsvRow(component: ComponentForExport): CsvRow {
  return {
    sku: component.sku,
    categoryKey: component.category.key,
    brandName: component.brand.name,
    model: component.model,
    price: String(component.price),
    description: component.description ?? "",
    images: JSON.stringify(component.images),
    isAvailable: String(component.isAvailable),
    stockQuantity: String(component.inventory?.stockQuantity ?? 0),
    lowStockThreshold: String(component.inventory?.lowStockThreshold ?? 5),
    specifications: JSON.stringify(component.specifications),
  };
}

export interface ParsedCsvComponent {
  sku: string;
  categoryKey: string;
  brandName: string;
  model: string;
  price: number;
  description?: string;
  images: string[];
  isAvailable: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  specifications: unknown;
}

// Throws a plain Error with a human-readable message on any problem — the
// import route catches this per-row so one bad row doesn't abort the batch.
export function parseCsvRow(row: Record<string, string>): ParsedCsvComponent {
  if (!row.sku) throw new Error("sku is required.");
  if (!row.categoryKey) throw new Error("categoryKey is required.");
  if (!row.brandName) throw new Error("brandName is required.");
  if (!row.model) throw new Error("model is required.");

  const price = Number(row.price);
  if (Number.isNaN(price)) throw new Error(`price "${row.price}" is not a number.`);

  let images: string[] = [];
  if (row.images) {
    try {
      const parsed = JSON.parse(row.images);
      if (!Array.isArray(parsed)) throw new Error();
      images = parsed;
    } catch {
      throw new Error('images column is not a valid JSON array (expected e.g. ["url1","url2"]).');
    }
  }

  let specifications: unknown = {};
  if (row.specifications) {
    try {
      specifications = JSON.parse(row.specifications);
    } catch {
      throw new Error("specifications column is not valid JSON.");
    }
  }

  return {
    sku: row.sku,
    categoryKey: row.categoryKey,
    brandName: row.brandName,
    model: row.model,
    price,
    description: row.description || undefined,
    images,
    isAvailable: row.isAvailable ? row.isAvailable.trim().toLowerCase() === "true" : true,
    stockQuantity: row.stockQuantity ? Number(row.stockQuantity) || 0 : 0,
    lowStockThreshold: row.lowStockThreshold ? Number(row.lowStockThreshold) || 5 : 5,
    specifications,
  };
}
