import { Prisma, prisma } from "@pcbuilder/database";

export interface InventoryRow {
  id: string;
  model: string;
  sku: string;
  categoryLabel: string;
  brandName: string;
  isAvailable: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  updatedAt: Date;
}

export interface InventoryOverview {
  totalComponents: number;
  outOfStockComponents: InventoryRow[];
  lowStockComponents: InventoryRow[];
  recentlyUpdatedComponents: InventoryRow[];
}

const overviewInclude = { category: true, brand: true, inventory: true } as const;

type ComponentWithRelations = Prisma.ComponentGetPayload<{ include: typeof overviewInclude }>;

function toRow(component: ComponentWithRelations): InventoryRow {
  return {
    id: component.id,
    model: component.model,
    sku: component.sku,
    categoryLabel: component.category.label,
    brandName: component.brand.name,
    isAvailable: component.isAvailable,
    stockQuantity: component.inventory?.stockQuantity ?? 0,
    lowStockThreshold: component.inventory?.lowStockThreshold ?? 0,
    updatedAt: component.updatedAt,
  };
}

// Powers the admin inventory dashboard (Phase 2, Milestone 2) and
// GET /api/inventory. Out-of-stock is a plain DB filter (stockQuantity <= 0
// is a constant comparison). Low-stock compares two columns on the SAME
// Inventory row (stockQuantity <= lowStockThreshold) — Prisma's `where` can't
// express a column-to-column comparison without raw SQL, so that one filters
// in application code after narrowing to in-stock rows via the DB. Fine at
// catalog sizes this app targets; revisit with a raw query if the catalog
// ever grows large enough for this to matter.
export async function getInventoryOverview(): Promise<InventoryOverview> {
  const [totalComponents, outOfStock, inStockCandidates, recentlyUpdated] = await Promise.all([
    prisma.component.count(),
    prisma.component.findMany({
      where: { inventory: { stockQuantity: { lte: 0 } } },
      include: overviewInclude,
      orderBy: { model: "asc" },
    }),
    prisma.component.findMany({
      where: { inventory: { stockQuantity: { gt: 0 } } },
      include: overviewInclude,
      orderBy: { model: "asc" },
    }),
    prisma.component.findMany({
      include: overviewInclude,
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const lowStock = inStockCandidates.filter(
    (component) =>
      component.inventory && component.inventory.stockQuantity <= component.inventory.lowStockThreshold,
  );

  return {
    totalComponents,
    outOfStockComponents: outOfStock.map(toRow),
    lowStockComponents: lowStock.map(toRow),
    recentlyUpdatedComponents: recentlyUpdated.map(toRow),
  };
}

// Admin/inventory-manager search: unlike the public /api/components route,
// this intentionally does NOT filter out isAvailable: false components —
// admins need to see everything they manage, not just what shoppers can see.
export async function searchAllComponents(query: string): Promise<InventoryRow[]> {
  const components = await prisma.component.findMany({
    where: query
      ? {
          OR: [
            { model: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: overviewInclude,
    orderBy: { model: "asc" },
    take: 50,
  });

  return components.map(toRow);
}
