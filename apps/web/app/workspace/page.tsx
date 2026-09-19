import { getServerSession } from "next-auth";
import { prisma } from "@pcbuilder/database";
import { authOptions } from "@/lib/auth";
import { toInitialBuild, workspaceBuildInclude } from "@/lib/builds";
import { BuildWorkspace, type InitialBuild } from "./build-workspace";

// Server component: fetches categories once (and, for `?build=<id>`, the
// signed-in user's saved build), then hands off to the client component for
// the interactive picker/compatibility/3D flow.
export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ build?: string }>;
}) {
  const { build: buildId } = await searchParams;
  const categories = await prisma.componentCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });

  let initialBuild: InitialBuild | undefined;
  if (buildId) {
    const session = await getServerSession(authOptions);
    const saved = session?.user
      ? await prisma.pCBuild.findFirst({
          where: { id: buildId, userId: session.user.id },
          include: workspaceBuildInclude,
        })
      : null;
    if (saved) {
      initialBuild = { ...toInitialBuild(saved), shareSlug: saved.isShared ? saved.shareSlug : null };
    }
  }

  // Keyed so navigating between saved builds remounts with fresh state.
  return (
    <BuildWorkspace
      key={initialBuild?.id ?? "new"}
      categories={categories}
      initialBuild={initialBuild}
    />
  );
}
