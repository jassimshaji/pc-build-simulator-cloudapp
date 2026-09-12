import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";

const updateSchema = z.object({
  componentId: z.string().min(1),
  stockQuantity: z.coerce.number().int().nonnegative().optional(),
  lowStockThreshold: z.coerce.number().int().nonnegative().optional(),
});

// Dedicated stock-update endpoint (distinct from PATCH /api/components/:id,
// which edits the Component itself) — this is the fast path for the common
// "restock" / "adjust threshold" action, without needing the full edit form.
export async function POST(request: Request) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const { componentId, stockQuantity, lowStockThreshold } = parsed.data;

  const component = await prisma.component.findUnique({ where: { id: componentId } });
  if (!component) {
    return NextResponse.json(apiError("Component not found."), { status: 404 });
  }

  const inventory = await prisma.inventory.upsert({
    where: { componentId },
    update: {
      stockQuantity,
      lowStockThreshold,
      lastRestockedAt: stockQuantity !== undefined ? new Date() : undefined,
    },
    create: {
      componentId,
      stockQuantity: stockQuantity ?? 0,
      lowStockThreshold: lowStockThreshold ?? 5,
    },
  });

  return NextResponse.json(apiSuccess(inventory));
}
