import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { extractHotFields, validateSpecifications } from "@pcbuilder/component-models";
import { requireRole } from "@/lib/requireRole";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const component = await prisma.component.findUnique({
    where: { id },
    include: { category: true, brand: true, inventory: true, threeDAssets: true },
  });

  if (!component) {
    return NextResponse.json(apiError("Component not found."), { status: 404 });
  }

  return NextResponse.json(apiSuccess(component));
}

const updateComponentSchema = z.object({
  brandName: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  price: z.coerce.number().nonnegative().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  isAvailable: z.boolean().optional(),
  specifications: z.unknown().optional(),
});

// Category and SKU are immutable after creation — recategorizing or
// re-skuing a component is "delete and recreate" territory, not an edit.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const existing = await prisma.component.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(apiError("Component not found."), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateComponentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const { brandName, model, price, description, images, isAvailable, specifications } = parsed.data;

  const data: Prisma.ComponentUpdateInput = {
    model,
    price,
    description,
    images,
    isAvailable,
  };

  if (brandName) {
    const brand = await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName },
    });
    data.brand = { connect: { id: brand.id } };
  }

  if (specifications !== undefined) {
    const category = await prisma.componentCategory.findUnique({
      where: { id: existing.categoryId },
    });
    const specResult = validateSpecifications(category?.key ?? "", specifications);
    if (!specResult.success) {
      return NextResponse.json(
        apiError("Invalid specifications for this category.", specResult.error.flatten()),
        { status: 400 },
      );
    }
    data.specifications = specResult.data as Prisma.InputJsonValue;
    Object.assign(data, extractHotFields(category?.key ?? "", specResult.data));
  }

  const component = await prisma.component.update({
    where: { id },
    data,
    include: { category: true, brand: true, inventory: true, threeDAssets: true },
  });

  return NextResponse.json(apiSuccess(component));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;

  try {
    await prisma.component.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(apiError("Component not found."), { status: 404 });
      }
      if (error.code === "P2003") {
        return NextResponse.json(
          apiError("Cannot delete a component that is used in a saved build."),
          { status: 409 },
        );
      }
    }
    throw error;
  }

  return NextResponse.json(apiSuccess({ id }));
}
