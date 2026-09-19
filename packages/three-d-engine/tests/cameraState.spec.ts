import { describe, expect, it } from "vitest";
import { cameraFromWorkspaceState, parseCameraState } from "../src/cameraState";

const valid = { position: [0.9, 0.6, 1.2], target: [0, 0.22, 0] };

describe("parseCameraState", () => {
  it("accepts a well-formed camera", () => {
    expect(parseCameraState(valid)).toEqual(valid);
  });

  it("rejects non-objects, missing fields and wrong lengths", () => {
    expect(parseCameraState(null)).toBeNull();
    expect(parseCameraState("camera")).toBeNull();
    expect(parseCameraState({ position: [1, 2, 3] })).toBeNull();
    expect(parseCameraState({ position: [1, 2], target: [0, 0, 0] })).toBeNull();
  });

  it("rejects non-numeric, non-finite and absurdly large coordinates", () => {
    expect(parseCameraState({ position: [1, "2", 3], target: [0, 0, 0] })).toBeNull();
    expect(parseCameraState({ position: [NaN, 0, 1], target: [0, 0, 0] })).toBeNull();
    expect(parseCameraState({ position: [Infinity, 0, 1], target: [0, 0, 0] })).toBeNull();
    expect(parseCameraState({ position: [1e6, 0, 1], target: [0, 0, 0] })).toBeNull();
  });

  it("rejects a camera sitting exactly on its target", () => {
    expect(parseCameraState({ position: [1, 1, 1], target: [1, 1, 1] })).toBeNull();
  });
});

describe("cameraFromWorkspaceState", () => {
  it("reads the camera out of a workspaceState blob", () => {
    expect(cameraFromWorkspaceState({ camera: valid })).toEqual(valid);
  });

  it("returns null when workspaceState is absent or has no valid camera", () => {
    expect(cameraFromWorkspaceState(null)).toBeNull();
    expect(cameraFromWorkspaceState({})).toBeNull();
    expect(cameraFromWorkspaceState({ camera: { position: "nope" } })).toBeNull();
  });
});
