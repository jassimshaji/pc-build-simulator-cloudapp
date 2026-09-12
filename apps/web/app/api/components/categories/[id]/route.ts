import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";

// `key` is immutable once created — it's what @pcbuilder/component-models'
// registry and every seeded Component row key off of; renaming it out from
// under existing data would silently break their category lookups.
const updateCategorySchema = z.object({
  label: z.string().min(1).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  try {
    const category = await prisma.componentCategory.update({ where: { id }, data: parsed.data });
    return NextResponse.json(apiSuccess(category));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(apiError("Category not found."), { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const componentCount = await prisma.component.count({ where: { categoryId: id } });
  if (componentCount > 0) {
    return NextResponse.json(
      apiError(`Cannot delete: ${componentCount} component(s) still use this category.`),
      { status: 409 },
    );
  }

  try {
    await prisma.componentCategory.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(apiError("Category not found."), { status: 404 });
    }
    throw error;
  }

  return NextResponse.json(apiSuccess({ id }));
}
