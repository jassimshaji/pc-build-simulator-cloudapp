import { afterEach, vi } from "vitest";
import { TEST_DATABASE_URL } from "../test-support/testDatabase";
import { setSession } from "./session";

// Must be set before anything imports @pcbuilder/database (its Prisma client
// reads DATABASE_URL when first constructed).
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Presigning an upload URL is a purely local signature (no network), but it
// needs *some* credentials and an endpoint to sign against.
process.env.S3_ENDPOINT ??= "http://127.0.0.1:8333";
process.env.S3_ACCESS_KEY_ID ??= "test";
process.env.S3_SECRET_ACCESS_KEY ??= "test";
process.env.S3_BUCKET_NAME ??= "pc-builder-assets";
process.env.S3_PUBLIC_URL ??= "http://127.0.0.1:8333/pc-builder-assets";

// Route handlers gate access through requireRole, which reads a next-auth JWT
// session — not available outside a real Next request. The mock reproduces its
// exact contract (401 / 403 / ok) against a session the test controls with
// setSession(); the real implementation is covered separately in
// requireRole.test.ts.
vi.mock("@/lib/requireRole", async () => {
  const { getSession } = await import("./session");
  return {
    requireRole: async (allowedRoles: string[]) => {
      const user = getSession();
      if (!user) return { ok: false, status: 401, message: "Not authenticated." };
      if (!allowedRoles.includes(user.role)) {
        return { ok: false, status: 403, message: "Insufficient permissions." };
      }
      return { ok: true, session: { user } };
    },
  };
});

afterEach(() => setSession(null));
