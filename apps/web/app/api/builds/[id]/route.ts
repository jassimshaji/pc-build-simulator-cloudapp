import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";
import {
  buildRowSchema,
  computeBuildSnapshot,
  findOwnedBuild,
  sanitizeWorkspaceState,
} from "@/lib/builds";

const ALL_ROLES = ["USER", "ADMIN", "INVENTORY_MANAGER"] as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const access = await requireRole([...ALL_ROLES]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const build = await prisma.pCBuild.findFirst({
    where: { id, userId: access.session.user.id },
    include: {
      components: {
        include: {
          component: { include: { category: true, brand: true, threeDAssets: true } },
        },
      },
    },
  });
  if (!build) {
    return NextResponse.json(apiError("Build not found."), { status: 404 });
  }

  return NextResponse.json(apiSuccess(build));
}

const updateBuildSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  rows: z.array(buildRowSchema).optional(),
  workspaceState: z.unknown().optional(),
});

// `rows`, when present, replaces the build's whole component set (the
// workspace saves its full state, not diffs).
export async function PATCH(request: Request, { params }: Params) {
  const access = await requireRole([...ALL_ROLES]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateBuildSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }
  const { name, rows, workspaceState } = parsed.data;

  if (!(await findOwnedBuild(id, access.session.user.id))) {
    return NextResponse.json(apiError("Build not found."), { status: 404 });
  }

  try {
    const snapshot = rows ? await computeBuildSnapshot(rows) : {};
    const cleanWorkspaceState = sanitizeWorkspaceState(workspaceState);
    const build = await prisma.pCBuild.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(cleanWorkspaceState !== undefined && { workspaceState: cleanWorkspaceState }),
        ...snapshot,
        ...(rows && { components: { deleteMany: {}, create: rows } }),
      },
    });
    return NextResponse.json(apiSuccess(build));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return NextResponse.json(apiError("One or more components no longer exist."), {
          status: 400,
        });
      }
      if (error.code === "P2025") {
        return NextResponse.json(apiError("Build not found."), { status: 404 });
      }
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const access = await requireRole([...ALL_ROLES]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const { count } = await prisma.pCBuild.deleteMany({
    where: { id, userId: access.session.user.id },
  });
  if (count === 0) {
    return NextResponse.json(apiError("Build not found."), { status: 404 });
  }

  return NextResponse.json(apiSuccess({ id }));
}
