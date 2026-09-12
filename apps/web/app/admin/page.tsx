import { redirect } from "next/navigation";
import { requireRole } from "@/lib/requireRole";

// Route access is also enforced by middleware.ts (redirects unauthenticated/
// wrong-role requests before this even renders); this server-side check is the
// authoritative one and is what future admin API routes should copy.
export default async function AdminPage() {
  const result = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);

  if (!result.ok) {
    redirect("/login");
  }

  return (
    <div className="flex-1 px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Signed in as {result.session.user.email} ({result.session.user.role}).
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Placeholder for the inventory admin dashboard (Phase 2).
        </p>
      </div>
    </div>
  );
}
