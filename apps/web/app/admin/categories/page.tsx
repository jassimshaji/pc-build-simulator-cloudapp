import { redirect } from "next/navigation";
import { prisma } from "@pcbuilder/database";
import { requireRole } from "@/lib/requireRole";
import { CategoryForm } from "./category-form";
import { CategoryRowActions } from "./category-row-actions";

export default async function CategoriesPage() {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    redirect("/login");
  }

  const categories = await prisma.componentCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { components: true } } },
  });

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-zinc-500">
          Adding a category here creates the data row immediately; without a matching
          schema in <code>@pcbuilder/component-models</code> it falls back to a
          permissive generic spec form until a developer adds a real one.
        </p>
        <CategoryForm />
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Sort order</th>
                <th className="px-3 py-2 font-medium">Components</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-zinc-900 last:border-b-0">
                  <td className="px-3 py-2 font-mono text-xs text-zinc-400">{category.key}</td>
                  <td className="px-3 py-2">{category.label}</td>
                  <td className="px-3 py-2 text-zinc-400">{category.sortOrder}</td>
                  <td className="px-3 py-2 text-zinc-400">{category._count.components}</td>
                  <td className="px-3 py-2">
                    <CategoryRowActions
                      id={category.id}
                      label={category.label}
                      sortOrder={category.sortOrder}
                      componentCount={category._count.components}
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
