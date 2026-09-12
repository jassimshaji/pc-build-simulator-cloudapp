import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export interface GenericGpuParams {
  length: number; // mm — card length, the horizontal dimension along the PCIe slot
  width: number; // mm — card thickness (front-to-back depth), independent of slotWidth
  height: number; // mm — bracket height
  slotWidth: number; // PCIe slots occupied — a count, not a geometry input; kept for signature parity with ARCHITECTURE.md §7.3
  fanCount: number;
}

export function createGenericGpu(params: GenericGpuParams): Group {
  const { length, width, height, fanCount } = params;
  const group = new Group();
  group.name = "GenericGpu";

  const body = new Mesh(
    new BoxGeometry(mm(length), mm(height), mm(width)),
    new MeshStandardMaterial({ color: 0x4b5563, roughness: 0.6 }),
  );
  group.add(body);

  // Fan cylinders on the card's front face (+Z), evenly spaced along its length.
  const fanRadius = Math.min(mm(height), mm(width)) * 0.4;
  const fanDepth = mm(width) * 0.05;
  const spacing = mm(length) / (fanCount + 1);
  for (let i = 0; i < fanCount; i++) {
    const fan = new Mesh(
      new CylinderGeometry(fanRadius, fanRadius, fanDepth, 24),
      new MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 }),
    );
    fan.rotation.x = Math.PI / 2;
    fan.position.set(-mm(length) / 2 + spacing * (i + 1), 0, mm(width) / 2 + fanDepth / 2);
    group.add(fan);
  }

  return group;
}
