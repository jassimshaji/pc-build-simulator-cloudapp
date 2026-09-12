import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@pcbuilder/database";
import { apiError } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";
import { CSV_COLUMNS, componentToCsvRow } from "@/lib/csv";

export async function GET() {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const components = await prisma.component.findMany({
    include: { category: true, brand: true, inventory: true },
    orderBy: { sku: "asc" },
  });

  const rows = components.map(componentToCsvRow);
  const csv = Papa.unparse({ fields: [...CSV_COLUMNS], data: rows.map((row) => CSV_COLUMNS.map((col) => row[col])) });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="components-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
