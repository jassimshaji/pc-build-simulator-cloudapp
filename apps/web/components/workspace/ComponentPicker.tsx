import { TextInput } from "@/components/ui/TextInput";
import type { Category, ComponentSummary } from "@/types/workspace";

// Left panel: search box, category list and the components in the active category.
export function ComponentPicker({
  categories,
  activeCategoryKey,
  onSelectCategory,
  search,
  onSearchChange,
  components,
  selectedId,
  onSelectComponent,
}: {
  categories: Category[];
  activeCategoryKey: string | null;
  onSelectCategory: (key: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  components: ComponentSummary[];
  selectedId: string | null;
  onSelectComponent: (component: ComponentSummary) => void;
}) {
  return (
    <aside className="flex shrink-0 flex-col border-b border-zinc-800 bg-zinc-900/40 lg:w-64 lg:border-b-0 lg:border-r lg:overflow-y-auto">
      <div className="p-3">
        <TextInput
          type="search"
          placeholder="Search components..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full px-3 py-1.5 text-sm"
        />
      </div>
      <nav className="flex gap-2 overflow-x-auto px-3 pb-3 text-sm lg:flex-col lg:gap-1 lg:overflow-x-visible">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.key)}
            className={`shrink-0 rounded px-3 py-1.5 text-left lg:w-full lg:shrink ${
              activeCategoryKey === category.key
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {category.label}
          </button>
        ))}
      </nav>
      <div className="flex flex-col gap-1 px-3 pb-3">
        {components.length === 0 && <p className="text-xs text-zinc-600">No components found.</p>}
        {components.map((component) => (
          <button
            key={component.id}
            type="button"
            onClick={() => onSelectComponent(component)}
            className={`rounded border px-2 py-1.5 text-left text-xs ${
              selectedId === component.id ? "border-zinc-600 bg-zinc-800" : "border-transparent hover:bg-zinc-900"
            }`}
          >
            <div className="text-zinc-200">{component.model}</div>
            <div className="text-zinc-500">
              {component.brand.name} · ${Number(component.price).toFixed(2)}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
