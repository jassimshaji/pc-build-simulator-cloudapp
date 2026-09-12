import { prisma } from "@pcbuilder/database";
import { BuildWorkspace } from "./build-workspace";

// Server component: fetches categories once, hands off to the client
// component for the interactive picker/compatibility flow (Phase 3,
// Milestone 4 — text-only, no 3D yet). The 3D scene itself replaces the
// center placeholder in Phase 4.
export default async function WorkspacePage() {
  const categories = await prisma.componentCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return <BuildWorkspace categories={categories} />;
}
