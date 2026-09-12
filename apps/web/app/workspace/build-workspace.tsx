"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import type { WorkspaceCanvasHandle } from "@pcbuilder/three-d-engine";

// WebGL needs a browser — @react-three/fiber's Canvas can't render on the
// server, so it's loaded client-only rather than through the normal static
// import every other component here uses.
const WorkspaceCanvas = dynamic(
  () => import("@pcbuilder/three-d-engine").then((mod) => mod.WorkspaceCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-600">
        Loading 3D scene...
      </div>
    ),
  },
);

interface Category {
  id: string;
  key: string;
  label: string;
}

interface ComponentSummary {
  id: string;
  model: string;
  price: string;
  specifications: Record<string, unknown>;
  category: { key: string; label: string };
  brand: { name: string };
}

interface BuildLine {
  componentId: string;
  categoryLabel: string;
  model: string;
  quantity: number;
}

// Renders a `specifications` value for display. Arrays join with commas;
// nested objects (e.g. a motherboard's `dimensionsMm: { width, depth }`)
// render as "key: value" pairs rather than the useless "[object Object]"
// that `String()` would otherwise produce.
function formatSpecValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => `${key}: ${nested}`)
      .join(", ");
  }
  return String(value);
}

// Text-only build flow (Phase 3, Milestone 4) — a real component picker and a
// live compatibility/power check, with the 3D placement itself still landing
// in Phase 4. This deliberately doesn't enforce "one CPU per build" or
// similar slot uniqueness yet: every added line is just quantity against a
// componentId, and the compatibility rules already tolerate multiples (e.g.
// they use the first CPU/motherboard found) — real slot enforcement is a
// Phase 4/5 concern once there's an actual 3D zone to place into.
export function BuildWorkspace({ categories }: { categories: Category[] }) {
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(
    categories[0]?.key ?? null,
  );
  const [search, setSearch] = useState("");
  const [components, setComponents] = useState<ComponentSummary[]>([]);
  const [selected, setSelected] = useState<ComponentSummary | null>(null);
  const [buildLines, setBuildLines] = useState<BuildLine[]>([]);
  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const canvasRef = useRef<WorkspaceCanvasHandle>(null);

  // Derived, not stored: true whenever the build has components but the check
  // for the current selection hasn't resolved yet (handleAdd/handleRemove
  // clear `report` back to null on every selection change below).
  const isCheckingCompatibility = buildLines.length > 0 && report === null;

  useEffect(() => {
    if (!activeCategoryKey) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ category: activeCategoryKey, limit: "50" });
    if (search) params.set("q", search);

    fetch(`/api/components?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((body) => setComponents(body?.data?.items ?? []))
      .catch((error) => {
        if (error.name !== "AbortError") setComponents([]);
      });

    return () => controller.abort();
  }, [activeCategoryKey, search]);

  useEffect(() => {
    if (buildLines.length === 0) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/compatibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        selections: buildLines.map((line) => ({
          componentId: line.componentId,
          quantity: line.quantity,
        })),
      }),
    })
      .then((response) => response.json())
      .then((body) => setReport(body?.data ?? null))
      .catch((error) => {
        if (error.name !== "AbortError") setReport(null);
      });

    return () => controller.abort();
  }, [buildLines]);

  function handleAdd(component: ComponentSummary) {
    const existing = buildLines.find((line) => line.componentId === component.id);
    const next = existing
      ? buildLines.map((line) =>
          line.componentId === component.id ? { ...line, quantity: line.quantity + 1 } : line,
        )
      : [
          ...buildLines,
          {
            componentId: component.id,
            categoryLabel: component.category.label,
            model: component.model,
            quantity: 1,
          },
        ];
    setBuildLines(next);
    setReport(null); // stale until the effect's check for the new selection resolves
  }

  function handleRemove(componentId: string) {
    setBuildLines(buildLines.filter((line) => line.componentId !== componentId));
    setReport(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Component inventory panel */}
        <aside className="flex shrink-0 flex-col border-b border-zinc-800 bg-zinc-900/40 lg:w-64 lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <div className="p-3">
            <input
              type="search"
              placeholder="Search components..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 text-sm lg:flex-col lg:gap-1 lg:overflow-x-visible">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryKey(category.key)}
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
            {components.length === 0 && (
              <p className="text-xs text-zinc-600">No components found.</p>
            )}
            {components.map((component) => (
              <button
                key={component.id}
                type="button"
                onClick={() => setSelected(component)}
                className={`rounded border px-2 py-1.5 text-left text-xs ${
                  selected?.id === component.id
                    ? "border-zinc-600 bg-zinc-800"
                    : "border-transparent hover:bg-zinc-900"
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

        {/* 3D workspace */}
        <main className="flex min-h-[16rem] flex-1 flex-col gap-2 border-b border-zinc-800 p-3 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="min-h-0 flex-1 overflow-hidden rounded border border-zinc-800">
            <WorkspaceCanvas ref={canvasRef} />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Drag to orbit · Scroll to zoom · Right-click drag to pan</span>
            <button
              type="button"
              onClick={() => canvasRef.current?.resetView()}
              className="rounded border border-zinc-800 px-2 py-1 hover:bg-zinc-900"
            >
              Reset view
            </button>
          </div>
        </main>

        {/* Component details / build / compatibility panel */}
        <aside className="flex shrink-0 flex-col gap-4 bg-zinc-900/40 p-4 text-sm lg:w-80 lg:overflow-y-auto">
          <div>
            <h2 className="font-medium text-zinc-200">Component details</h2>
            {selected ? (
              <div className="mt-2 space-y-2">
                <p className="text-zinc-300">
                  {selected.model} <span className="text-zinc-600">({selected.brand.name})</span>
                </p>
                <p className="text-zinc-500">${Number(selected.price).toFixed(2)}</p>
                <ul className="space-y-0.5 text-xs text-zinc-500">
                  {Object.entries(selected.specifications).map(([key, value]) => (
                    <li key={key}>
                      <span className="text-zinc-600">{key}:</span> {formatSpecValue(value)}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleAdd(selected)}
                  className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950"
                >
                  Add to build
                </button>
              </div>
            ) : (
              <p className="text-zinc-600">Select a component to see its specifications.</p>
            )}
          </div>

          <div>
            <h2 className="font-medium text-zinc-200">Your build</h2>
            {buildLines.length === 0 ? (
              <p className="text-zinc-600">No components added yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs">
                {buildLines.map((line) => (
                  <li key={line.componentId} className="flex items-center justify-between gap-2">
                    <span className="text-zinc-300">
                      {line.model}{" "}
                      <span className="text-zinc-600">
                        ({line.categoryLabel}
                        {line.quantity > 1 ? ` ×${line.quantity}` : ""})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(line.componentId)}
                      className="text-zinc-500 hover:text-red-400"
                      aria-label={`Remove ${line.model}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="font-medium text-zinc-200">Compatibility</h2>
            {buildLines.length === 0 && (
              <p className="text-zinc-600">Add components to see compatibility checks.</p>
            )}
            {isCheckingCompatibility && <p className="text-zinc-600">Checking...</p>}
            {report && (
              <ul className="mt-2 space-y-1.5 text-xs">
                {report.results.length === 0 ? (
                  <li className="text-zinc-600">No issues detected yet.</li>
                ) : (
                  report.results.map((result, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          result.severity === "ERROR"
                            ? "bg-red-950 text-red-400"
                            : result.severity === "WARNING"
                              ? "bg-amber-950 text-amber-400"
                              : "bg-emerald-950 text-emerald-400"
                        }`}
                      >
                        {result.severity}
                      </span>
                      <span className="text-zinc-400">{result.message}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Build summary bar */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 border-t border-zinc-800 bg-zinc-900/40 px-4 py-2 text-xs text-zinc-500">
        <span>
          Build summary:{" "}
          {buildLines.length === 0
            ? "no components yet"
            : `${buildLines.reduce((sum, line) => sum + line.quantity, 0)} component(s)`}
        </span>
        <span>
          Estimated power:{" "}
          {report ? `${report.estimatedPowerWatts}W (recommend ${report.recommendedPsuWattage}W PSU)` : "—"}
        </span>
        <span>Compatibility: {report ? report.overallStatus : "—"}</span>
      </footer>
    </div>
  );
}
