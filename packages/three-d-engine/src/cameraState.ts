// Camera state persisted in PCBuild.workspaceState so a saved build reopens
// from the same viewpoint. Pure and framework-agnostic; the JSON comes back
// from the database untyped, so it's validated rather than trusted.

export type Vec3 = [number, number, number];

export interface CameraState {
  position: Vec3;
  target: Vec3;
}

// Farthest a stored camera may be from the origin (scene units = meters). The
// workspace itself limits zoom to a few meters; this just rejects garbage.
const MAX_ABS_COORDINATE = 100;

function parseVec3(value: unknown): Vec3 | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  if (!value.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= MAX_ABS_COORDINATE)) {
    return null;
  }
  return [value[0], value[1], value[2]];
}

export function parseCameraState(value: unknown): CameraState | null {
  if (!value || typeof value !== "object") return null;
  const { position, target } = value as Record<string, unknown>;
  const parsedPosition = parseVec3(position);
  const parsedTarget = parseVec3(target);
  if (!parsedPosition || !parsedTarget) return null;
  // A camera sitting exactly on its target has no view direction.
  if (parsedPosition.every((n, i) => n === parsedTarget[i])) return null;
  return { position: parsedPosition, target: parsedTarget };
}

// Reads the camera out of a whole `workspaceState` blob ({ camera: ... }).
export function cameraFromWorkspaceState(workspaceState: unknown): CameraState | null {
  if (!workspaceState || typeof workspaceState !== "object") return null;
  return parseCameraState((workspaceState as Record<string, unknown>).camera);
}
