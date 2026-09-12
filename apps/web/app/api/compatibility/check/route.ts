import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@pcbuilder/shared";
import { checkBuildCompatibility } from "@/lib/compatibility";

const requestSchema = z.object({
  selections: z.array(
    z.object({
      componentId: z.string().min(1),
      quantity: z.coerce.number().int().positive().default(1),
    }),
  ),
});

// Public — read-only, computed from public component data, no different from
// browsing the catalog itself. Called identically by this route and any
// future client-side "live" check while placing components in the 3D
// workspace (Phase 4), per ARCHITECTURE.md §6's single-source-of-truth
// requirement — both paths go through @pcbuilder/compatibility-engine's
// runCompatibilityCheck via lib/compatibility.ts.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError("Invalid input.", parsed.error.flatten()), { status: 400 });
  }

  const report = await checkBuildCompatibility(parsed.data.selections);
  return NextResponse.json(apiSuccess(report));
}
