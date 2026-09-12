import { CATEGORIES } from "@/lib/categories";

// Layout-only shell for this milestone (Phase 1, Milestone 4): the three-panel
// workspace layout from the project brief, with placeholder content in every
// panel. Real component browsing (Phase 2), compatibility checks (Phase 3),
// and the actual 3D scene (Phase 4) replace these placeholders in later
// milestones — the panel structure itself is what's meant to stay stable.
export default function WorkspacePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Component inventory panel */}
        <aside className="flex shrink-0 flex-col border-b border-zinc-800 bg-zinc-900/40 lg:w-64 lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <div className="p-3">
            <input
              type="search"
              placeholder="Search components..."
              disabled
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 text-sm lg:flex-col lg:gap-1 lg:overflow-x-visible">
            {CATEGORIES.map((category) => (
              <button
                key={category.key}
                type="button"
                disabled
                className="shrink-0 rounded px-3 py-1.5 text-left text-zinc-400 lg:w-full lg:shrink"
              >
                {category.label}
              </button>
            ))}
          </nav>
          <p className="px-3 pb-3 text-xs text-zinc-600">
            Component browsing lands in Phase 2.
          </p>
        </aside>

        {/* 3D workspace */}
        <main className="flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-3 border-b border-zinc-800 p-6 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="flex h-full w-full max-w-2xl items-center justify-center rounded border border-dashed border-zinc-700 text-center text-sm text-zinc-600">
            3D workspace — lands in Phase 4
          </div>
          <div className="flex gap-2 text-xs text-zinc-500">
            <button type="button" disabled className="rounded border border-zinc-800 px-2 py-1">
              Orbit
            </button>
            <button type="button" disabled className="rounded border border-zinc-800 px-2 py-1">
              Zoom
            </button>
            <button type="button" disabled className="rounded border border-zinc-800 px-2 py-1">
              Pan
            </button>
            <button type="button" disabled className="rounded border border-zinc-800 px-2 py-1">
              Reset
            </button>
          </div>
        </main>

        {/* Component details / compatibility panel */}
        <aside className="flex shrink-0 flex-col gap-4 bg-zinc-900/40 p-4 text-sm lg:w-80 lg:overflow-y-auto">
          <div>
            <h2 className="font-medium text-zinc-200">Component details</h2>
            <p className="text-zinc-600">Select a component to see its specifications.</p>
          </div>
          <div>
            <h2 className="font-medium text-zinc-200">Compatibility</h2>
            <p className="text-zinc-600">Compatibility checks land in Phase 3.</p>
          </div>
        </aside>
      </div>

      {/* Build summary bar */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 border-t border-zinc-800 bg-zinc-900/40 px-4 py-2 text-xs text-zinc-500">
        <span>Build summary: no components yet</span>
        <span>Estimated power: —</span>
        <span>Compatibility: —</span>
      </footer>
    </div>
  );
}
