"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";

export interface WorkspaceCanvasHandle {
  resetView: () => void;
}

// Phase 4, Milestone 1: just the canvas + camera rig (orbit/zoom/pan are
// OrbitControls' built-in mouse/trackpad behavior; "Reset" is the one action
// that needs an explicit imperative call, exposed via `ref`). No procedural
// component models or installation zones yet (Milestones 2-3) — the single
// placeholder box below only proves the render pipeline actually works and
// gets replaced once real generators exist.
export const WorkspaceCanvas = forwardRef<WorkspaceCanvasHandle>(function WorkspaceCanvas(
  _props,
  ref,
) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  useImperativeHandle(ref, () => ({
    resetView: () => controlsRef.current?.reset(),
  }));

  return (
    <Canvas camera={{ position: [4, 3, 6], fov: 50 }}>
      <color attach="background" args={["#09090b"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <Grid args={[20, 20]} cellColor="#27272a" sectionColor="#3f3f46" fadeDistance={25} />
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#52525b" />
      </mesh>
      <OrbitControls ref={controlsRef} makeDefault enableDamping />
    </Canvas>
  );
});
