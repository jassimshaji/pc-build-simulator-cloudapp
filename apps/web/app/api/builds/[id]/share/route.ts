import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";
import { findOwnedBuild } from "@/lib/builds";

const shareSchema = z.object({ enabled: z.boolean() });

// Enabling mints a fresh unguessable slug (kept if the build is already
// shared, so the link doesn't change on repeated calls); disabling clears it,
// so a previously shared link stops working and re-enabling gives a new one.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["USER", "ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const parsed = shareSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const build = await findOwnedBuild(id, access.session.user.id);
  if (!build) {
    return NextResponse.json(apiError("Build not found."), { status: 404 });
  }

  if (!parsed.data.enabled) {
    await prisma.pCBuild.update({ where: { id }, data: { isShared: false, shareSlug: null } });
    return NextResponse.json(apiSuccess({ isShared: false, shareSlug: null }));
  }

  if (build.isShared && build.shareSlug) {
    return NextResponse.json(apiSuccess({ isShared: true, shareSlug: build.shareSlug }));
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const shareSlug = randomBytes(9).toString("base64url");
    try {
      await prisma.pCBuild.update({ where: { id }, data: { isShared: true, shareSlug } });
      return NextResponse.json(apiSuccess({ isShared: true, shareSlug }));
    } catch (error) {
      // P2002: slug collision (astronomically unlikely) — retry with a new one.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }
  }
  return NextResponse.json(apiError("Could not generate a share link."), { status: 500 });
}
