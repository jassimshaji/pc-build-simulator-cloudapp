import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";

export async function GET() {
  const categories = await prisma.componentCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(apiSuccess(categories));
}

const createCategorySchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Key must be UPPER_SNAKE_CASE (e.g. HDD, RGB_CONTROLLER)."),
  label: z.string().min(1),
  sortOrder: z.coerce.number().int().default(0),
});

// New categories are a data row, not a code change (ARCHITECTURE.md §4.3) — a
// key with no matching schema in @pcbuilder/component-models simply falls
// back to the permissive generic schema until a real one is written.
export async function POST(request: Request) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const existing = await prisma.componentCategory.findUnique({
    where: { key: parsed.data.key },
  });
  if (existing) {
    return NextResponse.json(apiError(`Category "${parsed.data.key}" already exists.`), {
      status: 409,
    });
  }

  const category = await prisma.componentCategory.create({ data: parsed.data });
  return NextResponse.json(apiSuccess(category), { status: 201 });
}
