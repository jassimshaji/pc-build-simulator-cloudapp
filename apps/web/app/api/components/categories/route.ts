import { NextResponse } from "next/server";
import { prisma } from "@pcbuilder/database";
import { apiSuccess } from "@pcbuilder/shared";

export async function GET() {
  const categories = await prisma.componentCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(apiSuccess(categories));
}
