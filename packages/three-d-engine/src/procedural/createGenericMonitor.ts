import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { mm } from "./units";

export interface GenericMonitorParams {
  screenSizeInches: number;
}

const ASPECT_WIDTH = 16;
const ASPECT_HEIGHT = 9;
const PANEL_THICKNESS_MM = 15;
const STAND_POST_HEIGHT_MM = 120;
const STAND_BASE_HEIGHT_MM = 15;

// No signature is documented for this generator in ARCHITECTURE.md §7.3 (only
// the six Milestone 2 categories plus Fan/Radiator/AIO/SSD are) — this
// derives a plausible 16:9 panel size from the one dimension the monitor
// spec schema actually carries (`screenSizeInches`, a diagonal measurement),
// same "generic, not exact" principle as every other generator here.
export function createGenericMonitor(params: GenericMonitorParams): Group {
  const diagonalMm = params.screenSizeInches * 25.4;
  const aspectDiagonal = Math.sqrt(ASPECT_WIDTH ** 2 + ASPECT_HEIGHT ** 2);
  const widthMm = (diagonalMm * ASPECT_WIDTH) / aspectDiagonal;
  const heightMm = (diagonalMm * ASPECT_HEIGHT) / aspectDiagonal;

  const group = new Group();
  group.name = "GenericMonitor";

  const panel = new Mesh(
    new BoxGeometry(mm(widthMm), mm(heightMm), mm(PANEL_THICKNESS_MM)),
    new MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 }),
  );
  panel.position.set(0, mm(heightMm) / 2 + mm(STAND_POST_HEIGHT_MM), 0);
  group.add(panel);

  const standPost = new Mesh(
    new BoxGeometry(mm(30), mm(STAND_POST_HEIGHT_MM), mm(30)),
    new MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 }),
  );
  standPost.position.set(0, mm(STAND_POST_HEIGHT_MM) / 2, 0);
  group.add(standPost);

  const standBase = new Mesh(
    new BoxGeometry(mm(200), mm(STAND_BASE_HEIGHT_MM), mm(150)),
    new MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 }),
  );
  standBase.position.set(0, mm(STAND_BASE_HEIGHT_MM) / 2, 0);
  group.add(standBase);

  return group;
}
