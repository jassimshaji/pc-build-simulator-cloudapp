import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";
import { buildRowSchema, computeBuildSnapshot, sanitizeWorkspaceState } from "@/lib/builds";

const ALL_ROLES = ["USER", "ADMIN", "INVENTORY_MANAGER"] as const;

export async function GET() {
  const access = await requireRole([...ALL_ROLES]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const builds = await prisma.pCBuild.findMany({
    where: { userId: access.session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      estimatedPowerWatts: true,
      compatibilityStatus: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { components: true } },
    },
  });

  return NextResponse.json(apiSuccess(builds));
}

const createBuildSchema = z.object({
  name: z.string().trim().min(1).max(100),
  rows: z.array(buildRowSchema).default([]),
  workspaceState: z.unknown().optional(),
});

export async function POST(request: Request) {
  const access = await requireRole([...ALL_ROLES]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createBuildSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }
  const { name, rows, workspaceState } = parsed.data;

  try {
    const snapshot = await computeBuildSnapshot(rows);
    const build = await prisma.pCBuild.create({
      data: {
        userId: access.session.user.id,
        name,
        workspaceState: sanitizeWorkspaceState(workspaceState),
        ...snapshot,
        components: { create: rows },
      },
    });
    return NextResponse.json(apiSuccess(build), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(apiError("One or more components no longer exist."), { status: 400 });
    }
    throw error;
  }
}
