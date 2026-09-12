import { redirect, notFound } from "next/navigation";
import { prisma } from "@pcbuilder/database";
import { requireRole } from "@/lib/requireRole";
import { ComponentForm } from "../../component-form";

export default async function EditComponentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    redirect("/login");
  }

  const { id } = await params;
  const [categories, component] = await Promise.all([
    prisma.componentCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.component.findUnique({ where: { id }, include: { category: true, brand: true } }),
  ]);

  if (!component) {
    notFound();
  }

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">Edit component</h1>
        <ComponentForm
          categories={categories.map((category) => ({ key: category.key, label: category.label }))}
          initialComponent={{
            id: component.id,
            sku: component.sku,
            categoryKey: component.category.key,
            brandName: component.brand.name,
            model: component.model,
            price: Number(component.price),
            description: component.description,
            images: component.images,
            isAvailable: component.isAvailable,
            specifications: component.specifications as Record<string, unknown>,
          }}
        />
      </div>
    </div>
  );
}
