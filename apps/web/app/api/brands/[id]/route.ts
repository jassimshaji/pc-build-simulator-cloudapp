import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateBrandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  try {
    const brand = await prisma.brand.update({ where: { id }, data: parsed.data });
    return NextResponse.json(apiSuccess(brand));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(apiError("Brand not found."), { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(apiError("A brand with that name already exists."), {
          status: 409,
        });
      }
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
  const componentCount = await prisma.component.count({ where: { brandId: id } });
  if (componentCount > 0) {
    return NextResponse.json(
      apiError(`Cannot delete: ${componentCount} component(s) still use this brand.`),
      { status: 409 },
    );
  }

  try {
    await prisma.brand.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(apiError("Brand not found."), { status: 404 });
    }
    throw error;
  }

  return NextResponse.json(apiSuccess({ id }));
}
