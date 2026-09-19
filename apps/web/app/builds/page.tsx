import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@pcbuilder/database";
import { authOptions } from "@/lib/auth";
import { BuildRowActions } from "./build-row-actions";

export default async function BuildsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const builds = await prisma.pCBuild.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { components: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-3xl p-6 text-zinc-100">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">My builds</h1>
        <Link href="/workspace" className="rounded bg-zinc-100 px-3 py-1.5 text-sm text-zinc-950">
          New build
        </Link>
      </div>

      {builds.length === 0 ? (
        <p className="text-sm text-zinc-500">No saved builds yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded border border-zinc-800">
          {builds.map((build) => (
            <li key={build.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <Link href={`/workspace?build=${build.id}`} className="text-sm hover:underline">
                  {build.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {build._count.components} component(s)
                  {build.estimatedPowerWatts ? ` · ~${build.estimatedPowerWatts}W` : ""} · updated{" "}
                  {build.updatedAt.toLocaleDateString()}
                </p>
              </div>
              <BuildRowActions id={build.id} name={build.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
