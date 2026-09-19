"use client";

import { useCallback, useState } from "react";
import type { CameraState, PlacedComponent } from "@pcbuilder/three-d-engine";
import { serializeBuild } from "@pcbuilder/three-d-engine/src/buildSerialization";
import type { BuildLine, InitialBuild } from "@/types/workspace";

// Saving, renaming and sharing the current build through the /api/builds routes.
// The first save creates the build; every later one replaces its component set
// (and the current camera viewpoint).
export function useBuildPersistence({
  initialBuild,
  buildLines,
  placements,
  getCamera,
}: {
  initialBuild?: InitialBuild;
  buildLines: BuildLine[];
  placements: Record<string, PlacedComponent>;
  getCamera: () => CameraState | null | undefined;
}) {
  const [buildId, setBuildId] = useState<string | null>(initialBuild?.id ?? null);
  const [buildName, setBuildName] = useState(initialBuild?.name ?? "My build");
  const [shareSlug, setShareSlug] = useState<string | null>(initialBuild?.shareSlug ?? null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const response = await fetch(buildId ? `/api/builds/${buildId}` : "/api/builds", {
        method: buildId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: buildName,
          rows: serializeBuild(buildLines, placements),
          workspaceState: { camera: getCamera() ?? undefined },
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus(
          response.status === 401 ? "Log in to save builds." : (body?.error?.message ?? "Save failed."),
        );
        return;
      }
      setBuildId(body.data.id);
      setStatus("Saved.");
    } catch {
      setStatus("Save failed.");
    } finally {
      setIsSaving(false);
    }
  }, [buildId, buildName, buildLines, placements, getCamera]);

  const setSharing = useCallback(
    async (enabled: boolean) => {
      if (!buildId) return;
      setStatus(null);
      const response = await fetch(`/api/builds/${buildId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      }).catch(() => null);
      const body = await response?.json().catch(() => null);
      if (!response?.ok) {
        setStatus(body?.error?.message ?? "Could not update sharing.");
        return;
      }
      setShareSlug(body.data.shareSlug);
    },
    [buildId],
  );

  const copyShareLink = useCallback(async () => {
    if (!shareSlug) return;
    const url = `${window.location.origin}/shared/${shareSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied.");
    } catch {
      setStatus(url); // clipboard blocked: show the link so it can be copied by hand
    }
  }, [shareSlug]);

  return { buildId, buildName, setBuildName, shareSlug, status, isSaving, save, setSharing, copyShareLink };
}
