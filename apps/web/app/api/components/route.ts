import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";

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
      include: { category: true, brand: true, inventory: true },
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
