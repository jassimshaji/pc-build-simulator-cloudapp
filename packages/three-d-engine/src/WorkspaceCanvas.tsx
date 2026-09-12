"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { Box3, type Group as ThreeGroup } from "three";
import {
  createGenericCase,
  createGenericCpu,
  createGenericGpu,
  createGenericMotherboard,
  createGenericPsu,
  createGenericRam,
} from "./procedural";

export interface WorkspaceCanvasHandle {
  resetView: () => void;
}

// Shifts a generated group so its bounding-box bottom sits at y=0 (it stands
// on the grid instead of being bisected by it) and moves it along x — a
// throwaway layout helper for this milestone's showcase row, not the real
// installation-zone placement system (Milestone 3).
function placeAt(group: ThreeGroup, x: number): ThreeGroup {
  const box = new Box3().setFromObject(group);
  group.position.set(x, -box.min.y, 0);
  return group;
}

// Phase 4, Milestone 2: the six procedural generators needed for a minimal
// end-to-end build (Case, Motherboard, CPU, RAM, GPU, PSU — see
// ARCHITECTURE.md §7.3) rendered in a row as a visual smoke test that they
// actually produce distinct, correctly-proportioned geometry. This row
// arrangement is temporary — real placement inside a case's installation
// zones, driven by user selections, lands in Milestones 3-4.
function useShowcaseModels() {
  return useMemo(
    () => [
      placeAt(
        createGenericCase({ formFactor: "ATX", dimensions: { width: 210, height: 450, depth: 450 } }),
        -2.25,
      ),
      placeAt(createGenericMotherboard({ formFactor: "ATX" }), -1.35),
      placeAt(createGenericCpu({ socket: "AM5" }), -0.45),
      placeAt(createGenericRam({ formFactor: "UDIMM", height: 34 }), 0.45),
      placeAt(
        createGenericGpu({ length: 300, width: 40, height: 120, slotWidth: 2, fanCount: 3 }),
        1.35,
      ),
      placeAt(createGenericPsu({ formFactor: "ATX", length: 160 }), 2.25),
    ],
    [],
  );
}

// Phase 4, Milestone 1: just the canvas + camera rig (orbit/zoom/pan are
// OrbitControls' built-in mouse/trackpad behavior; "Reset" is the one action
// that needs an explicit imperative call, exposed via `ref`).
export const WorkspaceCanvas = forwardRef<WorkspaceCanvasHandle>(function WorkspaceCanvas(
  _props,
  ref,
) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const showcaseModels = useShowcaseModels();

  useImperativeHandle(ref, () => ({
    resetView: () => controlsRef.current?.reset(),
  }));

  return (
    <Canvas camera={{ position: [5, 3.5, 8], fov: 50 }}>
      <color attach="background" args={["#09090b"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <Grid args={[20, 20]} cellColor="#27272a" sectionColor="#3f3f46" fadeDistance={25} />
      {showcaseModels.map((model, index) => (
        <primitive key={index} object={model} />
      ))}
      <OrbitControls ref={controlsRef} makeDefault enableDamping />
    </Canvas>
  );
});
