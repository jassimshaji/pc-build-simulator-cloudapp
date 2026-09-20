import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { rateLimit } from "@/lib/rateLimit";
import { requireRole } from "@/lib/requireRole";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  ALLOWED_MODEL_CONTENT_TYPES,
  MAX_MODEL_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  buildAssetKey,
  createUploadUrl,
  getPublicAssetUrl,
} from "@/lib/storage";

const requestUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  purpose: z.enum(["image", "model"]).default("image"),
  size: z.number().int().positive(), // bytes; signed into the upload URL
});

// Issues a short-lived presigned PUT URL for an admin to upload a component
// image or 3D model directly to object storage (the request never sends
// file bytes through this server — see ARCHITECTURE.md §9). The client PUTs
// the file to `uploadUrl` with the same Content-Type (and the declared `size`,
// which is signed into the URL), then uses `publicUrl`
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

  const { filename, contentType, purpose, size } = parsed.data;

  const limit = rateLimit("upload", access.session.user.id);
  if (!limit.allowed) {
    return NextResponse.json(apiError("Too many upload requests. Try again later."), {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const maxBytes = purpose === "model" ? MAX_MODEL_UPLOAD_BYTES : MAX_UPLOAD_BYTES;
  if (size > maxBytes) {
    return NextResponse.json(
      apiError(`File is too large: ${purpose} uploads are limited to ${maxBytes / (1024 * 1024)} MB.`),
      { status: 413 },
    );
  }

  const allowedTypes: readonly string[] =
    purpose === "model" ? ALLOWED_MODEL_CONTENT_TYPES : ALLOWED_IMAGE_CONTENT_TYPES;
  if (!allowedTypes.includes(contentType)) {
    return NextResponse.json(
      apiError(`Unsupported content type "${contentType}" for ${purpose} upload.`),
      { status: 400 },
    );
  }

  const key = buildAssetKey(filename, purpose === "model" ? "models" : "components");
  const uploadUrl = await createUploadUrl(key, contentType, size);

  return NextResponse.json(apiSuccess({ uploadUrl, publicUrl: getPublicAssetUrl(key), key }));
}
