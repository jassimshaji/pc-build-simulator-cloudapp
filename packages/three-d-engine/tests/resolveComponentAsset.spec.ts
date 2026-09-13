import { describe, expect, it } from "vitest";
import { Group } from "three";
import { resolveComponentAsset } from "../src/resolveComponentAsset";

const FAN_SPEC = { sizeMm: 120 };

describe("resolveComponentAsset", () => {
  it("resolves to gltf when the asset is GLTF_MODEL with a real url", () => {
    const resolution = resolveComponentAsset("FAN", FAN_SPEC, {
      kind: "GLTF_MODEL",
      url: "https://assets.example.com/fan.glb",
    });
    expect(resolution).toEqual({ type: "gltf", url: "https://assets.example.com/fan.glb" });
  });

  it("falls back to procedural when GLTF_MODEL is missing its url (malformed row)", () => {
    const resolution = resolveComponentAsset("FAN", FAN_SPEC, { kind: "GLTF_MODEL", url: null });
    expect(resolution.type).toBe("procedural");
    if (resolution.type === "procedural") {
      expect(resolution.model).toBeInstanceOf(Group);
    }
  });

  it("resolves to placeholder for an explicit PLACEHOLDER asset", () => {
    const resolution = resolveComponentAsset("FAN", FAN_SPEC, { kind: "PLACEHOLDER" });
    expect(resolution).toEqual({ type: "placeholder" });
  });

  it("resolves to a real generated model for PROCEDURAL_FALLBACK", () => {
    const resolution = resolveComponentAsset("FAN", FAN_SPEC, { kind: "PROCEDURAL_FALLBACK" });
    expect(resolution.type).toBe("procedural");
    if (resolution.type === "procedural") {
      expect(resolution.model).toBeInstanceOf(Group);
    }
  });

  it("falls back to the same procedural generator when there's no ThreeDAsset row at all", () => {
    const withNoAsset = resolveComponentAsset("FAN", FAN_SPEC);
    const withNullAsset = resolveComponentAsset("FAN", FAN_SPEC, null);
    expect(withNoAsset.type).toBe("procedural");
    expect(withNullAsset.type).toBe("procedural");
    if (withNoAsset.type === "procedural" && withNullAsset.type === "procedural") {
      expect(withNoAsset.model).toBeInstanceOf(Group);
      expect(withNullAsset.model).toBeInstanceOf(Group);
    }
  });

  it("returns a null model for an unrecognized category, same as buildGenericModel", () => {
    const resolution = resolveComponentAsset("NOT_A_REAL_CATEGORY", {});
    expect(resolution).toEqual({ type: "procedural", model: null });
  });
});
