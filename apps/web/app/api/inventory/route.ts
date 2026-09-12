import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";
import { getInventoryOverview } from "@/lib/inventory";

export async function GET() {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const overview = await getInventoryOverview();
  return NextResponse.json(apiSuccess(overview));
}
