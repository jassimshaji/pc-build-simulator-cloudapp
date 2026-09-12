import { redirect } from "next/navigation";
import { requireRole } from "@/lib/requireRole";
import { ImportExportPanel } from "./import-export-panel";

export default async function ImportExportPage() {
  const access = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!access.ok) {
    redirect("/login");
  }

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Import / Export</h1>
        <ImportExportPanel />
      </div>
    </div>
  );
}
