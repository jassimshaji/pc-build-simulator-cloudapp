import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { requireRole } from "@/lib/requireRole";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  ALLOWED_MODEL_CONTENT_TYPES,
  buildAssetKey,
  createUploadUrl,
  getPublicAssetUrl,
} from "@/lib/storage";

const requestUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  purpose: z.enum(["image", "model"]).default("image"),
});

// Issues a short-lived presigned PUT URL for an admin to upload a component
// image or 3D model directly to object storage (the request never sends
// file bytes through this server — see ARCHITECTURE.md §9). The client PUTs
// the file to `uploadUrl` with the same Content-Type, then uses `publicUrl`
// as the component's image URL or ThreeDAsset.url.
export async function POST(request: Request) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    return NextResponse.json(apiError(access.message), { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const { filename, contentType, purpose } = parsed.data;
  const allowedTypes: readonly string[] =
    purpose === "model" ? ALLOWED_MODEL_CONTENT_TYPES : ALLOWED_IMAGE_CONTENT_TYPES;
  if (!allowedTypes.includes(contentType)) {
    return NextResponse.json(
      apiError(`Unsupported content type "${contentType}" for ${purpose} upload.`),
      { status: 400 },
    );
  }

  const key = buildAssetKey(filename, purpose === "model" ? "models" : "components");
  const uploadUrl = await createUploadUrl(key, contentType);

  return NextResponse.json(apiSuccess({ uploadUrl, publicUrl: getPublicAssetUrl(key), key }));
}
