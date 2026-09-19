import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import { prisma } from "@pcbuilder/database";
import { toInitialBuild, workspaceBuildInclude } from "@/lib/builds";
import { SharedBuildView } from "./shared-build-view";

// Public, no auth: anyone with the unguessable slug can view. Only builds the
// owner has explicitly shared (isShared) resolve; the slug is cleared when
// sharing is turned off, so stale links 404.
async function loadSharedBuild(slug: string) {
  return prisma.pCBuild.findFirst({
    where: { shareSlug: slug, isShared: true },
    include: workspaceBuildInclude,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const build = await loadSharedBuild(slug);
  return { title: build ? `${build.name} — PC Builder` : "Build not found" };
}

export default async function SharedBuildPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const saved = await loadSharedBuild(slug);
  if (!saved) {
    notFound();
  }

  return (
    <SharedBuildView
      build={toInitialBuild(saved)}
      report={(saved.compatibilityStatus as CompatibilityReport | null) ?? null}
    />
  );
}
