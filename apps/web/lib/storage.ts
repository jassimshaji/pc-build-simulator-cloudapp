import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3-compatible object storage client. In production this points at
// Cloudflare R2 (ARCHITECTURE.md §8); locally it points at a self-hosted
// SeaweedFS S3 gateway (open-source, actively maintained — MinIO's
// community server was discontinued when this was set up, see
// project-management/DECISIONS.md ADR-008). Same S3 API either way, so the
// only thing that changes between environments is configuration.
//
// `requestChecksumCalculation: "WHEN_REQUIRED"` is required for presigned
// PUT URLs to work at all: newer AWS SDK v3 versions default to embedding a
// checksum computed from an (empty, at signing time) body into the signed
// URL's query string, which then fails to match whatever bytes the client
// actually uploads later. Without this, every presigned upload gets a 400
// BadDigest — verified empirically against SeaweedFS during this milestone.
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const BUCKET = process.env.S3_BUCKET_NAME ?? "pc-builder-assets";
const PUBLIC_URL_BASE = process.env.S3_PUBLIC_URL ?? "";

export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

// Advisory only: presigned PUT URLs can't enforce a byte-size limit the way
// a presigned POST policy could. Acceptable for now since uploads are
// ADMIN/INVENTORY_MANAGER-only (a trusted-user boundary), not public — see
// ARCHITECTURE.md §9. Revisit with presigned POST conditions if this ever
// needs to hold up against untrusted uploaders.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export function buildAssetKey(filename: string): string {
  return `components/${randomUUID()}-${sanitizeFilename(filename)}`;
}

export async function createUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}

export function getPublicAssetUrl(key: string): string {
  return `${PUBLIC_URL_BASE}/${key}`;
}
