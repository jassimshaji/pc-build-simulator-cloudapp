"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { estimateCfm, fanFlowDirection, streamLoopsPerSecond, streamProgress } from "./airflow";
import { mm } from "./procedural/units";
import type { FanMountFace } from "./zones/generateCaseZones";

const PARTICLE_COUNT = 6;
const STREAM_LENGTH_MM = 320;
const INTAKE_COLOR = "#38bdf8";
const EXHAUST_COLOR = "#fb923c";

// Which axis air travels along at each face, and which way is "out of the
// case" on that axis (front is -Z, rear +Z, top +Y — matching generateCaseZones).
const FACE_AXIS: Record<FanMountFace, { axis: "y" | "z"; outward: 1 | -1 }> = {
  FRONT: { axis: "z", outward: -1 },
  REAR: { axis: "z", outward: 1 },
  TOP: { axis: "y", outward: 1 },
};

// Animated particles streaming through one placed fan, in the direction it
// actually moves air: exhaust travels outward through its face, intake inward.
export function AirflowStream({
  position,
  face,
  specifications,
}: {
  position: [number, number, number];
  face: FanMountFace;
  specifications: Record<string, unknown>;
}) {
  const flow = fanFlowDirection(specifications.bladeDirection, face);
  const cfm =
    typeof specifications.airflowCfm === "number" && specifications.airflowCfm > 0
      ? specifications.airflowCfm
      : estimateCfm(specifications.sizeMm);
  const sizeMm = typeof specifications.sizeMm === "number" ? specifications.sizeMm : 120;
  const { axis, outward } = FACE_AXIS[face];
  const direction = flow === "EXHAUST" ? outward : -outward;
  const length = mm(STREAM_LENGTH_MM);
  const radius = mm(sizeMm) * 0.32;

  const meshRefs = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const speed = streamLoopsPerSecond(cfm);
    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const p = streamProgress(clock.elapsedTime, index, PARTICLE_COUNT, speed);
      mesh.position[axis] = direction * (p - 0.5) * length;
      // Fade in at the start of the stream and out at the end.
      (mesh.material as MeshBasicMaterial).opacity = Math.sin(Math.PI * p) * 0.85;
    });
  });

  return (
    <group position={position}>
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        // Spread particles across the fan face (the plane perpendicular to the
        // travel axis) in a small two-ring spiral.
        const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
        const ring = index % 2 === 0 ? 0.55 : 1;
        const a = Math.cos(angle) * radius * ring;
        const b = Math.sin(angle) * radius * ring;
        const start: [number, number, number] = axis === "z" ? [a, b, 0] : [a, 0, b];
        return (
          <mesh
            key={index}
            ref={(mesh) => {
              meshRefs.current[index] = mesh;
            }}
            position={start}
          >
            <sphereGeometry args={[mm(9), 8, 8]} />
            <meshBasicMaterial
              color={flow === "INTAKE" ? INTAKE_COLOR : EXHAUST_COLOR}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
