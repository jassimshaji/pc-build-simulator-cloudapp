import { redirect } from "next/navigation";
import { prisma } from "@pcbuilder/database";
import { requireRole } from "@/lib/requireRole";
import { ComponentForm } from "../component-form";

export default async function NewComponentPage() {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    redirect("/login");
  }

  const categories = await prisma.componentCategory.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">New component</h1>
        <ComponentForm categories={categories.map((category) => ({ key: category.key, label: category.label }))} />
      </div>
    </div>
  );
}
