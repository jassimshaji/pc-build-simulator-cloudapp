"use client";

import {
  Component,
  Suspense,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, type Group as ThreeGroup } from "three";
import { createGenericCase } from "./procedural";
import { mm } from "./procedural/units";
import { extractCaseZoneSpec, extractMotherboardZoneSpec } from "./placement";
import { resolveComponentAsset, type PlacedComponentAsset } from "./resolveComponentAsset";
import { composeZone, generateCaseZones, generateMotherboardZones, type InstallationZone } from "./zones";

export interface WorkspaceCanvasHandle {
  resetView: () => void;
}

// A component that has actually been placed somewhere in the 3D scene — the
// case itself, or anything sitting in one of its (or a placed motherboard's)
// zones. `specifications` is passed straight through from the real
// `Component` row so this package can re-derive whatever it needs (zone
// specs, generic model params) without apps/web needing to know this
// package's internal shapes.
export interface PlacedComponent {
  componentId: string;
  categoryKey: string;
  specifications: Record<string, unknown>;
  // The component's real ThreeDAsset row, when the caller has it (e.g. from
  // `Component.threeDAssets[0]`). Absent/undefined means "no row at all" —
  // resolveComponentAsset treats that the same as PROCEDURAL_FALLBACK, per
  // ARCHITECTURE.md §7.3's resolution order.
  asset?: PlacedComponentAsset | null;
}

export interface WorkspaceCanvasProps {
  // The case currently in the build — rendered immediately (it's the root
  // container, not something placed *into* a zone).
  caseComponent?: PlacedComponent | null;
  // Everything placed into a zone so far, keyed by zone key. "MOBO_TRAY"
  // holding a MOTHERBOARD is what makes the motherboard (and its own zones)
  // appear at all — until then there's nothing to compose its zones onto.
  placements?: Record<string, PlacedComponent>;
  // The category of the component currently selected in the picker (Phase
  // 3's build-workspace.tsx) — zones that accept this category highlight,
  // per ARCHITECTURE.md §7.1's "select component -> compatible zones
  // highlight" step. Typed as a plain string (rather than importing
  // component-models' CategoryKey) so callers don't need to validate an
  // arbitrary ComponentCategory.key before passing it through.
  highlightCategory?: string | null;
  // Fired when an unoccupied, highlighted zone is clicked — the "click a
  // highlighted zone -> snap component into place" step. The parent decides
  // whether the currently selected component actually belongs there (this
  // package has no notion of "currently selected component", only zones).
  onZoneClick?: (zoneKey: string, acceptsCategory: string) => void;
}

// Places a generated group so its bounding-box bottom sits at y=0 (it stands
// on the grid instead of being bisected by it). Returns the group's
// resulting world position — zone marker positions (which are relative to
// the *same* local origin the group's geometry is centered on) are added to
// this to get their own world position.
function placeAt(group: ThreeGroup, x: number): [number, number, number] {
  const box = new Box3().setFromObject(group);
  const position: [number, number, number] = [x, -box.min.y, 0];
  group.position.set(...position);
  return position;
}

const ZONE_MARKER_SIZE_MM = 45;
const ZONE_COLOR_INACTIVE = "#52525b";
const ZONE_COLOR_HIGHLIGHTED = "#22d3ee";
const ZONE_COLOR_OCCUPIED = "#a3a3a3";

// The last-resort marker: an admin-marked PLACEHOLDER, a GLTF still loading,
// a GLTF that failed to load, or (unreachable for any real category since
// Milestone 5) a category with no generator at all. Same shape/color
// Milestone 4 used for "occupied, nothing to render yet" — reused rather
// than inventing a second visual language for what is, to the viewer, the
// same situation: "something is placed here but there's no real shape".
function OccupiedFallbackMarker({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[mm(ZONE_MARKER_SIZE_MM), mm(ZONE_MARKER_SIZE_MM), mm(ZONE_MARKER_SIZE_MM)]} />
      <meshStandardMaterial color={ZONE_COLOR_OCCUPIED} />
    </mesh>
  );
}

// A procedurally-generated THREE.Group isn't a React element — position is
// applied imperatively once, matching how Milestone 4/5 already did this.
function GeneratedModel({
  model,
  position,
}: {
  model: ThreeGroup;
  position: [number, number, number];
}) {
  useEffect(() => {
    model.position.set(...position);
  }, [model, position]);
  return <primitive object={model} />;
}

// `useGLTF` caches and returns the *same* scene object for a given url, so
// two placements of the same real component (e.g. two identical RAM sticks
// in two slots) would otherwise fight over one Object3D's parent/position.
// Cloning per placement keeps each occurrence independent.
function GltfPlacedModel({
  url,
  position,
}: {
  url: string;
  position: [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const instance = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    instance.position.set(...position);
  }, [instance, position]);
  return <primitive object={instance} />;
}

// `useGLTF` suspends while loading and throws on a bad/unreachable url —
// without this boundary a single broken GLTF asset would crash the whole
// canvas instead of just that one placement.
class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("Failed to load a placed component's 3D asset:", error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// Dispatches a placed component to whichever of the three resolution
// outcomes applies (ARCHITECTURE.md §7.3): a real uploaded GLTF, the
// procedural generator, or an explicit placeholder.
function PlacedComponentModel({
  placement,
  position,
}: {
  placement: PlacedComponent;
  position: [number, number, number];
}) {
  const resolution = useMemo(
    () => resolveComponentAsset(placement.categoryKey, placement.specifications, placement.asset),
    [placement],
  );

  if (resolution.type === "gltf") {
    const fallback = <OccupiedFallbackMarker position={position} />;
    return (
      <ModelErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <GltfPlacedModel url={resolution.url} position={position} />
        </Suspense>
      </ModelErrorBoundary>
    );
  }

  if (resolution.type === "placeholder" || !resolution.model) {
    return <OccupiedFallbackMarker position={position} />;
  }

  return <GeneratedModel model={resolution.model} position={position} />;
}

// One zone: either empty (a translucent marker, brighter when it accepts the
// currently highlighted category, clickable), or occupied (the placed
// component's resolved asset — a real GLTF, its generated model, or a
// placeholder).
function ZoneMarker({
  zone,
  worldPosition,
  placement,
  highlightCategory,
  onZoneClick,
}: {
  zone: InstallationZone;
  worldPosition: [number, number, number];
  placement?: PlacedComponent;
  highlightCategory?: string | null;
  onZoneClick?: (zoneKey: string, acceptsCategory: string) => void;
}) {
  if (placement) {
    return <PlacedComponentModel placement={placement} position={worldPosition} />;
  }

  const isHighlighted = highlightCategory != null && zone.acceptsCategory === highlightCategory;
  return (
    <mesh
      position={worldPosition}
      onClick={(event) => {
        event.stopPropagation();
        onZoneClick?.(zone.key, zone.acceptsCategory);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "auto";
      }}
    >
      <boxGeometry args={[mm(ZONE_MARKER_SIZE_MM), mm(ZONE_MARKER_SIZE_MM), mm(ZONE_MARKER_SIZE_MM)]} />
      <meshBasicMaterial
        color={isHighlighted ? ZONE_COLOR_HIGHLIGHTED : ZONE_COLOR_INACTIVE}
        transparent
        opacity={isHighlighted ? 0.9 : 0.25}
      />
    </mesh>
  );
}

function ZoneMarkers({
  zones,
  origin,
  placements,
  highlightCategory,
  onZoneClick,
}: {
  zones: InstallationZone[];
  origin: [number, number, number];
  placements: Record<string, PlacedComponent>;
  highlightCategory?: string | null;
  onZoneClick?: (zoneKey: string, acceptsCategory: string) => void;
}) {
  return (
    <>
      {zones.map((zone) => (
        <ZoneMarker
          key={zone.key}
          zone={zone}
          worldPosition={[
            origin[0] + zone.position[0],
            origin[1] + zone.position[1],
            origin[2] + zone.position[2],
          ]}
          placement={placements[zone.key]}
          highlightCategory={highlightCategory}
          onZoneClick={onZoneClick}
        />
      ))}
    </>
  );
}

// Phase 4, Milestones 1-4: the canvas + camera rig (orbit/zoom/pan are
// OrbitControls' built-in mouse/trackpad behavior; "Reset" is the one action
// that needs an explicit imperative call, exposed via `ref`); a real case (if
// one's in the build) with its generated zones; and, once a motherboard is
// actually placed in the case's MOBO_TRAY zone, the motherboard itself with
// its own zones composed into world space (the composition step Milestone 3
// deferred). Every unoccupied zone is clickable and highlights when it
// accepts the currently selected picker category — click-to-place per
// ARCHITECTURE.md §7.1.
export const WorkspaceCanvas = forwardRef<WorkspaceCanvasHandle, WorkspaceCanvasProps>(
  function WorkspaceCanvas({ caseComponent, placements = {}, highlightCategory, onZoneClick }, ref) {
    const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);

    useImperativeHandle(ref, () => ({
      resetView: () => controlsRef.current?.reset(),
    }));

    const caseScene = useMemo(() => {
      if (!caseComponent) return null;
      const zoneSpec = extractCaseZoneSpec(caseComponent.specifications);
      if (!zoneSpec) return null;
      // Always build the procedural case: it's what determines the origin
      // zones are positioned relative to (the zone system's positions are
      // schematic, authored against this generator's own coordinate
      // convention — see Milestone 3/4 — not against whatever proportions an
      // arbitrary uploaded GLTF happens to have), and it doubles as the
      // Suspense/error fallback so a real case model still has something
      // reasonable to show while loading or on failure.
      const model = createGenericCase({ formFactor: "ATX", dimensions: zoneSpec.dimensions });
      const origin = placeAt(model, 0);
      const zones = generateCaseZones(zoneSpec);
      return { model, zones, origin };
    }, [caseComponent]);

    // Whether to actually display the procedural case above, or a real
    // uploaded GLTF at the same origin — the one place in this component
    // that needs to resolve an asset outside the zone/placement system,
    // since the case is the root container rather than something placed
    // into a zone.
    const caseAssetResolution = useMemo(() => {
      if (!caseComponent) return null;
      return resolveComponentAsset("CASE", caseComponent.specifications, caseComponent.asset);
    }, [caseComponent]);

    // The motherboard's own model isn't rendered separately here — once
    // MOBO_TRAY is occupied, the case's own ZoneMarkers below already
    // renders it (via buildGenericModel("MOTHERBOARD", ...)) at exactly this
    // zone's position. This memo only needs to produce the motherboard's
    // *own* zones (RAM/PCIe/M.2/SATA slots), composed into world space by
    // adding the MOBO_TRAY zone's world position as their origin — the
    // composition step Milestone 3 deferred.
    const motherboardPlacement = placements.MOBO_TRAY;
    const motherboardZones = useMemo(() => {
      if (!caseScene || !motherboardPlacement) return null;
      const moboZoneOnCase = caseScene.zones.find((zone) => zone.key === "MOBO_TRAY");
      const zoneSpec = extractMotherboardZoneSpec(motherboardPlacement.specifications);
      if (!moboZoneOnCase || !zoneSpec) return null;

      const worldOrigin: [number, number, number] = [
        caseScene.origin[0] + moboZoneOnCase.position[0],
        caseScene.origin[1] + moboZoneOnCase.position[1],
        caseScene.origin[2] + moboZoneOnCase.position[2],
      ];
      return generateMotherboardZones(zoneSpec).map((zone) => composeZone(zone, worldOrigin));
    }, [caseScene, motherboardPlacement]);

    return (
      <Canvas camera={{ position: [5, 3.5, 8], fov: 50 }}>
        <color attach="background" args={["#09090b"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <Grid args={[20, 20]} cellColor="#27272a" sectionColor="#3f3f46" fadeDistance={25} />

        {caseScene && (
          <>
            {caseAssetResolution?.type === "gltf" ? (
              <ModelErrorBoundary fallback={<primitive object={caseScene.model} />}>
                <Suspense fallback={<primitive object={caseScene.model} />}>
                  <GltfPlacedModel url={caseAssetResolution.url} position={caseScene.origin} />
                </Suspense>
              </ModelErrorBoundary>
            ) : (
              <primitive object={caseScene.model} />
            )}
            <ZoneMarkers
              zones={caseScene.zones}
              origin={caseScene.origin}
              placements={placements}
              highlightCategory={highlightCategory}
              onZoneClick={onZoneClick}
            />
          </>
        )}

        {motherboardZones && (
          <ZoneMarkers
            zones={motherboardZones}
            origin={[0, 0, 0]}
            placements={placements}
            highlightCategory={highlightCategory}
            onZoneClick={onZoneClick}
          />
        )}

        <OrbitControls ref={controlsRef} makeDefault enableDamping />
      </Canvas>
    );
  },
);
