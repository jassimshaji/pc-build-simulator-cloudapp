"use client";

import { useCallback, useRef, useState } from "react";
import type { WorkspaceCanvasHandle } from "@pcbuilder/three-d-engine";
import { SceneCanvas } from "@/components/scene-canvas";
import { BuildSidebar } from "@/components/workspace/BuildSidebar";
import { ComponentPicker } from "@/components/workspace/ComponentPicker";
import { SaveBar } from "@/components/workspace/SaveBar";
import { StatusFooter } from "@/components/workspace/StatusFooter";
import { ViewportControls } from "@/components/workspace/ViewportControls";
import { useBuildDraft } from "@/hooks/useBuildDraft";
import { useBuildPersistence } from "@/hooks/useBuildPersistence";
import { useCompatibilityReport } from "@/hooks/useCompatibilityReport";
import { useComponentCatalog } from "@/hooks/useComponentCatalog";
import type { Category, ComponentSummary, InitialBuild } from "@/types/workspace";

// The interactive workspace: pick components, see them in 3D, get live
// compatibility/power feedback, and save/share the build. This component only
// composes — the state lives in hooks (catalog, draft build, compatibility
// report, persistence) and every panel is its own component under
// components/workspace/.
//
// Placement: "Add to build" drops a part into the first free compatible zone
// (needs a case, and a motherboard for RAM/GPU/etc.); alternatively select a
// part and click a highlighted zone in the 3D view to choose the slot. A build
// holds at most one case, motherboard, CPU and PSU (lib/buildDraft.ts).
export function BuildWorkspace({
  categories,
  initialBuild,
}: {
  categories: Category[];
  initialBuild?: InitialBuild;
}) {
  const canvasRef = useRef<WorkspaceCanvasHandle>(null);
  const [selected, setSelected] = useState<ComponentSummary | null>(null);
  const [showAirflow, setShowAirflow] = useState(true);

  const catalog = useComponentCatalog(categories);
  const draft = useBuildDraft(initialBuild);
  const { report, isChecking } = useCompatibilityReport(draft.buildLines);
  const persistence = useBuildPersistence({
    initialBuild,
    buildLines: draft.buildLines,
    placements: draft.placements,
    getCamera: useCallback(() => canvasRef.current?.getCameraState(), []),
  });

  // The case renders in 3D as soon as it's added — it's the root container,
  // not something placed *into* a zone. (Takes the first CASE line if more
  // than one somehow ended up in the build.)
  const caseLine = draft.buildLines.find((line) => line.categoryKey === "CASE");

  // "Add to build": add the part and, if there's a free compatible zone, place it.
  function handleAddAndPlace(component: ComponentSummary) {
    const zoneKey =
      component.category.key === "CASE" ? null : canvasRef.current?.findFreeZone(component.category.key);
    draft.addComponent(component, zoneKey);
  }

  // Click-to-place: only does anything when the clicked zone accepts the
  // selected component's category (the 3D package has no notion of "the
  // selected component", only zones).
  function handleZoneClick(zoneKey: string, acceptsCategory: string) {
    if (selected && selected.category.key === acceptsCategory) {
      draft.addComponent(selected, zoneKey);
    }
  }

  return (
    // Pinned to the viewport below the 3.5rem nav so the panels scroll
    // internally instead of the whole page growing past the footer.
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <SaveBar
        buildName={persistence.buildName}
        onBuildNameChange={persistence.setBuildName}
        isSaved={persistence.buildId !== null}
        isSaving={persistence.isSaving}
        onSave={persistence.save}
        shareSlug={persistence.shareSlug}
        onSetSharing={persistence.setSharing}
        onCopyShareLink={persistence.copyShareLink}
        status={persistence.status}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <ComponentPicker
          categories={categories}
          activeCategoryKey={catalog.activeCategoryKey}
          onSelectCategory={catalog.setActiveCategoryKey}
          search={catalog.search}
          onSearchChange={catalog.setSearch}
          components={catalog.components}
          selectedId={selected?.id ?? null}
          onSelectComponent={setSelected}
        />

        <main className="flex min-h-[16rem] flex-1 flex-col gap-2 border-b border-zinc-800 p-3 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="min-h-0 flex-1 overflow-hidden rounded border border-zinc-800">
            <SceneCanvas
              ref={canvasRef}
              caseComponent={
                caseLine
                  ? {
                      componentId: caseLine.componentId,
                      categoryKey: "CASE",
                      specifications: caseLine.specifications,
                      asset: caseLine.asset,
                    }
                  : null
              }
              placements={draft.placements}
              highlightCategory={selected?.category.key ?? null}
              onZoneClick={handleZoneClick}
              showAirflow={showAirflow}
              initialCamera={initialBuild?.camera}
            />
          </div>
          {draft.notice && (
            <p role="alert" className="rounded border border-amber-700 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-300">
              {draft.notice}
            </p>
          )}
          <ViewportControls
            showAirflow={showAirflow}
            onShowAirflowChange={setShowAirflow}
            onResetView={() => canvasRef.current?.resetView()}
          />
        </main>

        <BuildSidebar
          selected={selected}
          hasCase={caseLine !== undefined}
          onAdd={handleAddAndPlace}
          lines={draft.buildLines}
          placements={draft.placements}
          onRemove={draft.removeComponent}
          report={report}
          isChecking={isChecking}
        />
      </div>

      <StatusFooter lines={draft.buildLines} report={report} />
    </div>
  );
}
