"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { Box3, type Group as ThreeGroup } from "three";
import { createGenericCase, createGenericMotherboard } from "./procedural";
import { mm } from "./procedural/units";
import { generateCaseZones, generateMotherboardZones, type InstallationZone } from "./zones";

export interface WorkspaceCanvasHandle {
  resetView: () => void;
}

export interface WorkspaceCanvasProps {
  // The category currently selected in the component picker (Phase 3's
  // build-workspace.tsx) — zones that accept this category highlight. Typed
  // as a plain string (rather than importing component-models' CategoryKey)
  // so callers don't need to validate an arbitrary ComponentCategory.key
  // before passing it through — an unrecognized value just matches nothing.
  highlightCategory?: string | null;
}

// Places a generated group so its bounding-box bottom sits at y=0 (it stands
// on the grid instead of being bisected by it) and shifts it along x. Returns
// the group's resulting world position — zone marker positions (which are
// relative to the *same* local origin the group's geometry is centered on)
// are added to this to get their own world position.
function placeAt(group: ThreeGroup, x: number): [number, number, number] {
  const box = new Box3().setFromObject(group);
  const position: [number, number, number] = [x, -box.min.y, 0];
  group.position.set(...position);
  return position;
}

function useCaseWithZones() {
  return useMemo(() => {
    const dimensions = { width: 210, height: 450, depth: 450 };
    const model = createGenericCase({ formFactor: "ATX", dimensions });
    const origin = placeAt(model, -1.6);
    const zones = generateCaseZones({
      dimensions,
      maxGpuLengthMm: 381,
      maxCpuCoolerHeightMm: 165,
      driveBays: { "3.5in": 2, "2.5in": 2 },
      fanSupportMm: [120, 140],
      radiatorSupport: ["240mm front", "280mm front"],
    });
    return { model, zones, origin };
  }, []);
}

function useMotherboardWithZones() {
  return useMemo(() => {
    const model = createGenericMotherboard({ formFactor: "ATX" });
    const origin = placeAt(model, 1.6);
    const zones = generateMotherboardZones({ ramSlots: 4, pcieSlots: 3, m2Slots: 4, sataPorts: 4 });
    return { model, zones, origin };
  }, []);
}

const ZONE_MARKER_SIZE_MM = 45;
const ZONE_COLOR_INACTIVE = "#52525b";
const ZONE_COLOR_HIGHLIGHTED = "#22d3ee";

// Renders each zone as a small translucent box at its world position
// (origin + the zone's own local position). Zones whose `acceptsCategory`
// matches the currently selected picker category glow brighter — the
// "would this be compatible if placed here" affordance from ARCHITECTURE.md
// §7.1, minus the actual click-to-place snap (Milestone 4).
function ZoneMarkers({
  zones,
  origin,
  highlightCategory,
}: {
  zones: InstallationZone[];
  origin: [number, number, number];
  highlightCategory?: string | null;
}) {
  return (
    <>
      {zones.map((zone) => {
        const isHighlighted = highlightCategory != null && zone.acceptsCategory === highlightCategory;
        return (
          <mesh
            key={zone.key}
            position={[
              origin[0] + zone.position[0],
              origin[1] + zone.position[1],
              origin[2] + zone.position[2],
            ]}
          >
            <boxGeometry args={[mm(ZONE_MARKER_SIZE_MM), mm(ZONE_MARKER_SIZE_MM), mm(ZONE_MARKER_SIZE_MM)]} />
            <meshBasicMaterial
              color={isHighlighted ? ZONE_COLOR_HIGHLIGHTED : ZONE_COLOR_INACTIVE}
              transparent
              opacity={isHighlighted ? 0.9 : 0.25}
            />
          </mesh>
        );
      })}
    </>
  );
}

// Phase 4, Milestone 1-3: the canvas + camera rig (orbit/zoom/pan are
// OrbitControls' built-in mouse/trackpad behavior; "Reset" is the one action
// that needs an explicit imperative call, exposed via `ref`), a case and a
// motherboard each shown with their own generated installation zones as a
// visual proof the zone data model works (Milestone 3) — full click-to-place,
// composing a motherboard's zones into the case's actual world position once
// really placed, is Milestone 4.
export const WorkspaceCanvas = forwardRef<WorkspaceCanvasHandle, WorkspaceCanvasProps>(
  function WorkspaceCanvas({ highlightCategory }, ref) {
    const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
    const caseScene = useCaseWithZones();
    const motherboardScene = useMotherboardWithZones();

    useImperativeHandle(ref, () => ({
      resetView: () => controlsRef.current?.reset(),
    }));

    return (
      <Canvas camera={{ position: [5, 3.5, 8], fov: 50 }}>
        <color attach="background" args={["#09090b"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <Grid args={[20, 20]} cellColor="#27272a" sectionColor="#3f3f46" fadeDistance={25} />

        <primitive object={caseScene.model} />
        <ZoneMarkers
          zones={caseScene.zones}
          origin={caseScene.origin}
          highlightCategory={highlightCategory}
        />

        <primitive object={motherboardScene.model} />
        <ZoneMarkers
          zones={motherboardScene.zones}
          origin={motherboardScene.origin}
          highlightCategory={highlightCategory}
        />

        <OrbitControls ref={controlsRef} makeDefault enableDamping />
      </Canvas>
    );
  },
);
