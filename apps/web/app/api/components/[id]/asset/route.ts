import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@pcbuilder/database";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";

const assetSchema = z
  .object({
    kind: z.enum(["GLTF_MODEL", "PROCEDURAL_FALLBACK", "PLACEHOLDER"]),
    url: z.string().url().optional(),
    proceduralGeneratorKey: z.string().optional(),
    source: z.string().optional(),
    licenseInfo: z.string().optional(),
    attribution: z.string().optional(),
    usageRights: z.string().optional(),
  })
  .refine((data) => data.kind !== "GLTF_MODEL" || Boolean(data.url), {
    message: "url is required when kind is GLTF_MODEL.",
    path: ["url"],
  })
  .refine((data) => data.kind !== "PROCEDURAL_FALLBACK" || Boolean(data.proceduralGeneratorKey), {
    message: "proceduralGeneratorKey is required when kind is PROCEDURAL_FALLBACK.",
    path: ["proceduralGeneratorKey"],
  });

// One managed ThreeDAsset "slot" per component for this admin UI (the schema
// technically allows several per component — e.g. future multi-angle models
// — but that's beyond what Milestone 6 needs). Upserts: updates the existing
// row if one exists, creates one otherwise.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const { id } = await params;
  const component = await prisma.component.findUnique({ where: { id } });
  if (!component) {
    return NextResponse.json(apiError("Component not found."), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = assetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const { kind, url, proceduralGeneratorKey, source, licenseInfo, attribution, usageRights } =
    parsed.data;

  const data = {
    componentId: id,
    kind,
    url: kind === "GLTF_MODEL" ? url : null,
    proceduralGeneratorKey: kind === "PROCEDURAL_FALLBACK" ? proceduralGeneratorKey : null,
    source: source || null,
    licenseInfo: licenseInfo || null,
    attribution: attribution || null,
    usageRights: (usageRights || null) as Prisma.InputJsonValue,
  };

  const existing = await prisma.threeDAsset.findFirst({ where: { componentId: id } });

  const asset = existing
    ? await prisma.threeDAsset.update({ where: { id: existing.id }, data })
    : await prisma.threeDAsset.create({ data });

  return NextResponse.json(apiSuccess(asset));
}
