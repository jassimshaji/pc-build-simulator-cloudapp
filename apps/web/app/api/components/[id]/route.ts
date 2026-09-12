import { NextResponse } from "next/server";
import { prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";

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
