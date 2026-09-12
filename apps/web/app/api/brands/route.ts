import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";

export async function GET() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { components: true } } },
  });
  return NextResponse.json(apiSuccess(brands));
}

const createBrandSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createBrandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const existing = await prisma.brand.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json(apiError(`A brand named "${parsed.data.name}" already exists.`), {
      status: 409,
    });
  }

  const brand = await prisma.brand.create({ data: parsed.data });
  return NextResponse.json(apiSuccess(brand), { status: 201 });
}
