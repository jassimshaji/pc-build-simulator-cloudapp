"use client";

import { forwardRef } from "react";
import dynamic from "next/dynamic";
import type { WorkspaceCanvasHandle, WorkspaceCanvasProps } from "@pcbuilder/three-d-engine";
import { useTheme } from "@/hooks/useTheme";

// WebGL needs a browser — @react-three/fiber's Canvas can't render on the
// server, so it's loaded client-only rather than through a normal import.
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

// The 3D scene, wired to the app theme. Used by both the editable workspace and
// the public shared view, so the client-only loading and theming live in one
// place. The `ref` reaches the canvas's imperative handle (reset view, find a
// free zone, read the camera).
export const SceneCanvas = forwardRef<WorkspaceCanvasHandle, Omit<WorkspaceCanvasProps, "theme">>(
  function SceneCanvas(props, ref) {
    const { theme } = useTheme();
    return <WorkspaceCanvas ref={ref} theme={theme} {...props} />;
  },
);
