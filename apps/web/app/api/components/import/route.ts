import { NextResponse } from "next/server";
import Papa from "papaparse";
import { Prisma, prisma } from "@pcbuilder/database";
import { extractHotFields, validateSpecifications } from "@pcbuilder/component-models";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";
import { parseCsvRow } from "@/lib/csv";

interface ImportFailure {
  row: number;
  sku?: string;
  error: string;
}

// Upserts by SKU: re-importing a previously exported (and possibly
// hand-edited) CSV updates existing components rather than erroring on
// duplicates. Rows are processed independently (no all-or-nothing
// transaction) — a bad row is reported and skipped rather than aborting
// every other row in the file, which is the more useful behavior for a bulk
// import a human will be reviewing the results of anyway.
export async function POST(request: Request) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(apiError("Missing CSV file (expected form field \"file\")."), {
      status: 400,
    });
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json(apiError("Could not parse CSV.", parsed.errors), { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const failed: ImportFailure[] = [];

  for (let index = 0; index < parsed.data.length; index += 1) {
    const rowNumber = index + 2; // +1 for 0-index, +1 for the header row
    const rawRow = parsed.data[index];

    try {
      const row = parseCsvRow(rawRow);

      const category = await prisma.componentCategory.findUnique({
        where: { key: row.categoryKey },
      });
      if (!category) {
        throw new Error(`Unknown category "${row.categoryKey}".`);
      }

      const specResult = validateSpecifications(row.categoryKey, row.specifications);
      if (!specResult.success) {
        throw new Error(
          `Invalid specifications: ${JSON.stringify(specResult.error.flatten().fieldErrors)}`,
        );
      }

      const brand = await prisma.brand.upsert({
        where: { name: row.brandName },
        update: {},
        create: { name: row.brandName },
      });

      const hotFields = extractHotFields(row.categoryKey, specResult.data);
      const sharedData = {
        categoryId: category.id,
        brandId: brand.id,
        model: row.model,
        price: row.price,
        description: row.description,
        images: row.images,
        isAvailable: row.isAvailable,
        specifications: specResult.data as Prisma.InputJsonValue,
        ...hotFields,
      };

      const existing = await prisma.component.findUnique({ where: { sku: row.sku } });

      if (existing) {
        await prisma.component.update({ where: { id: existing.id }, data: sharedData });
        await prisma.inventory.upsert({
          where: { componentId: existing.id },
          update: { stockQuantity: row.stockQuantity, lowStockThreshold: row.lowStockThreshold },
          create: {
            componentId: existing.id,
            stockQuantity: row.stockQuantity,
            lowStockThreshold: row.lowStockThreshold,
          },
        });
        updated += 1;
      } else {
        await prisma.component.create({
          data: {
            sku: row.sku,
            ...sharedData,
            inventory: {
              create: {
                stockQuantity: row.stockQuantity,
                lowStockThreshold: row.lowStockThreshold,
              },
            },
          },
        });
        created += 1;
      }
    } catch (error) {
      failed.push({
        row: rowNumber,
        sku: rawRow?.sku,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json(
    apiSuccess({ total: parsed.data.length, created, updated, failed }),
  );
}
