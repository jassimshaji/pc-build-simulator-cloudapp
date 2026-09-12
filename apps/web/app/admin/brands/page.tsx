import { redirect } from "next/navigation";
import { prisma } from "@pcbuilder/database";
import { requireRole } from "@/lib/requireRole";
import { BrandForm } from "./brand-form";
import { BrandRowActions } from "./brand-row-actions";

export default async function BrandsPage() {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    redirect("/login");
  }

  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { components: true } } },
  });

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Brands</h1>
        <BrandForm />
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Components</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} className="border-b border-zinc-900 last:border-b-0">
                  <td className="px-3 py-2">{brand.name}</td>
                  <td className="px-3 py-2 text-zinc-400">{brand._count.components}</td>
                  <td className="px-3 py-2">
                    <BrandRowActions
                      id={brand.id}
                      name={brand.name}
                      componentCount={brand._count.components}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
