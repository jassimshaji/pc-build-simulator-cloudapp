import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { extractHotFields, validateSpecifications } from "@pcbuilder/component-models";
import { requireRole } from "@/lib/requireRole";

const querySchema = z.object({
  category: z.string().optional(), // ComponentCategory.key, e.g. "CPU"
  brand: z.string().optional(), // Brand.name
  q: z.string().optional(), // free-text match against model
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid query parameters.", parsed.error.flatten()), {
      status: 400,
    });
  }

  const { category, brand, q, minPrice, maxPrice, page, limit } = parsed.data;

  const where: Prisma.ComponentWhereInput = { isAvailable: true };
  if (category) where.category = { key: category };
  if (brand) where.brand = { name: brand };
  if (q) where.model = { contains: q, mode: "insensitive" };
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.component.findMany({
      where,
      include: { category: true, brand: true, inventory: true, threeDAssets: true },
      orderBy: { model: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.component.count({ where }),
  ]);

  return NextResponse.json(
    apiSuccess({ items, total, page, limit, totalPages: Math.ceil(total / limit) }),
  );
}

const createComponentSchema = z.object({
  sku: z.string().min(1),
  categoryKey: z.string().min(1),
  brandName: z.string().min(1),
  model: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  isAvailable: z.boolean().default(true),
  specifications: z.unknown(),
});

// Admin/inventory-manager only. `specifications` is validated against the
// category's own schema from @pcbuilder/component-models (registry.ts) —
// not by this route's own Zod schema, which only covers the fields every
// component shares. Hot columns (socket/formFactor/etc.) are derived from
// the validated specifications, never taken from client input directly.
export async function POST(request: Request) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createComponentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const { sku, categoryKey, brandName, model, price, description, images, isAvailable, specifications } =
    parsed.data;

  const category = await prisma.componentCategory.findUnique({ where: { key: categoryKey } });
  if (!category) {
    return NextResponse.json(apiError(`Unknown category "${categoryKey}".`), { status: 400 });
  }

  const specResult = validateSpecifications(categoryKey, specifications);
  if (!specResult.success) {
    return NextResponse.json(
      apiError("Invalid specifications for this category.", specResult.error.flatten()),
      { status: 400 },
    );
  }

  const existingSku = await prisma.component.findUnique({ where: { sku } });
  if (existingSku) {
    return NextResponse.json(apiError(`A component with SKU "${sku}" already exists.`), {
      status: 409,
    });
  }

  const brand = await prisma.brand.upsert({
    where: { name: brandName },
    update: {},
    create: { name: brandName },
  });

  const hotFields = extractHotFields(categoryKey, specResult.data);

  const component = await prisma.component.create({
    data: {
      sku,
      categoryId: category.id,
      brandId: brand.id,
      model,
      price,
      description,
      images,
      isAvailable,
      specifications: specResult.data as Prisma.InputJsonValue,
      ...hotFields,
      inventory: { create: { stockQuantity: 0, lowStockThreshold: 5 } },
    },
    include: { category: true, brand: true, inventory: true },
  });

  return NextResponse.json(apiSuccess(component), { status: 201 });
}
