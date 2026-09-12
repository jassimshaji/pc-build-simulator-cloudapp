import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/requireRole";
import { getInventoryOverview, searchAllComponents, type InventoryRow } from "@/lib/inventory";
import { DeleteComponentButton } from "./delete-component-button";
import { StockCell } from "./stock-cell";

function ComponentTable({ rows, emptyMessage }: { rows: InventoryRow[]; emptyMessage: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400">
          <tr>
            <th className="px-3 py-2 font-medium">Model</th>
            <th className="px-3 py-2 font-medium">SKU</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Brand</th>
            <th className="px-3 py-2 font-medium">Stock</th>
            <th className="px-3 py-2 font-medium">Updated</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-900 last:border-b-0">
              <td className="px-3 py-2">
                {row.model}
                {!row.isAvailable && (
                  <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                    unavailable
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-zinc-400">{row.sku}</td>
              <td className="px-3 py-2 text-zinc-400">{row.categoryLabel}</td>
              <td className="px-3 py-2 text-zinc-400">{row.brandName}</td>
              <td className="px-3 py-2">
                <StockCell componentId={row.id} stockQuantity={row.stockQuantity} />
              </td>
              <td className="px-3 py-2 text-zinc-400">
                {row.updatedAt.toLocaleDateString()}
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-3">
                  <Link href={`/admin/components/${row.id}/edit`} className="text-zinc-300 hover:underline">
                    Edit
                  </Link>
                  <DeleteComponentButton id={row.id} model={row.model} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const result = await requireRole(["ADMIN", "INVENTORY_MANAGER"]);
  if (!result.ok) {
    redirect("/login");
  }

  const { q } = await searchParams;
  const [overview, searchResults] = await Promise.all([
    getInventoryOverview(),
    q ? searchAllComponents(q) : Promise.resolve(null),
  ]);

  return (
    <div className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Inventory Admin</h1>
            <p className="text-zinc-400">
              Signed in as {result.session.user.email} ({result.session.user.role}).
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/brands"
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
            >
              Brands
            </Link>
            <Link
              href="/admin/categories"
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
            >
              Categories
            </Link>
            <Link
              href="/admin/import-export"
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
            >
              Import / Export
            </Link>
            <Link
              href="/admin/components/new"
              className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-950"
            >
              New component
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500">Total components</p>
            <p className="text-2xl font-semibold">{overview.totalComponents}</p>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500">Low stock</p>
            <p className="text-2xl font-semibold">{overview.lowStockComponents.length}</p>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500">Out of stock</p>
            <p className="text-2xl font-semibold">{overview.outOfStockComponents.length}</p>
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-zinc-200">Search components</h2>
          <form method="GET" className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by model or SKU..."
              className="w-full max-w-sm rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100"
            />
            <button
              type="submit"
              className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-950"
            >
              Search
            </button>
          </form>
          {searchResults && (
            <ComponentTable
              rows={searchResults}
              emptyMessage={`No components match "${q}".`}
            />
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-zinc-200">Out of stock</h2>
          <ComponentTable
            rows={overview.outOfStockComponents}
            emptyMessage="Nothing is out of stock."
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-zinc-200">Low stock</h2>
          <ComponentTable rows={overview.lowStockComponents} emptyMessage="Nothing is low on stock." />
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-zinc-200">Recently updated</h2>
          <ComponentTable
            rows={overview.recentlyUpdatedComponents}
            emptyMessage="No components yet."
          />
        </section>

        <p className="text-xs text-zinc-600">
          The 3D asset manager lands in Phase 2, Milestone 6.
        </p>
      </div>
    </div>
  );
}
