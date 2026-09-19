import { NextResponse } from "next/server";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["USER", "ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const source = await prisma.pCBuild.findFirst({
    where: { id, userId: access.session.user.id },
    include: { components: true },
  });
  if (!source) {
    return NextResponse.json(apiError("Build not found."), { status: 404 });
  }

  // Sharing state (isShared/shareSlug) is deliberately not copied — a
  // duplicate starts private, and shareSlug is unique anyway.
  const copy = await prisma.pCBuild.create({
    data: {
      userId: source.userId,
      name: `${source.name} (copy)`.slice(0, 100),
      workspaceState: (source.workspaceState ?? undefined) as Prisma.InputJsonValue | undefined,
      compatibilityStatus: (source.compatibilityStatus ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      estimatedPowerWatts: source.estimatedPowerWatts,
      components: {
        create: source.components.map((row) => ({
          componentId: row.componentId,
          installedZoneKey: row.installedZoneKey,
          positionX: row.positionX,
          positionY: row.positionY,
          positionZ: row.positionZ,
          rotationX: row.rotationX,
          rotationY: row.rotationY,
          rotationZ: row.rotationZ,
        })),
      },
    },
  });

  return NextResponse.json(apiSuccess(copy), { status: 201 });
}
