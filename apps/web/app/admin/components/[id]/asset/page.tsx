import { redirect, notFound } from "next/navigation";
import { prisma } from "@pcbuilder/database";
import { requireRole } from "@/lib/requireRole";
import { AssetForm } from "./asset-form";

export default async function ComponentAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    redirect("/login");
  }

  const { id } = await params;
  const component = await prisma.component.findUnique({
    where: { id },
    include: { category: true, brand: true, threeDAssets: true },
  });

  if (!component) {
    notFound();
  }

  const existingAsset = component.threeDAssets[0] ?? null;

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">3D Asset</h1>
          <p className="text-zinc-400">
            {component.model} ({component.category.label}, {component.brand.name})
          </p>
        </div>
        <AssetForm
          componentId={component.id}
          categoryKey={component.category.key}
          initialAsset={
            existingAsset
              ? {
                  kind: existingAsset.kind,
                  url: existingAsset.url,
                  proceduralGeneratorKey: existingAsset.proceduralGeneratorKey,
                  source: existingAsset.source,
                  licenseInfo: existingAsset.licenseInfo,
                  attribution: existingAsset.attribution,
                  usageRights:
                    typeof existingAsset.usageRights === "string"
                      ? existingAsset.usageRights
                      : null,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
