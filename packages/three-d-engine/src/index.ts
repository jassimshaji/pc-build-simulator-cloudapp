export { WorkspaceCanvas } from "./WorkspaceCanvas";
export type { WorkspaceCanvasHandle, WorkspaceCanvasProps, PlacedComponent } from "./WorkspaceCanvas";

export * from "./procedural";
export * from "./zones";
export { extractCaseZoneSpec, extractMotherboardZoneSpec, buildGenericModel } from "./placement";
export { UNPLACED_ZONE_KEY, serializeBuild, deserializeBuild } from "./buildSerialization";
export type { BuildLineRef, BuildRow, DeserializedBuild } from "./buildSerialization";
export {
  isFanMountZone,
  fanMountFaceForZone,
  fanFlowDirection,
  estimateCfm,
  summarizeAirflow,
  streamProgress,
  streamLoopsPerSecond,
} from "./airflow";
export type { FanFlow, CasePressure, AirflowFan, AirflowPlacement, AirflowSummary } from "./airflow";
export {
  estimateNoise,
  estimateThermals,
  estimatePerformance,
  estimateFanDba,
  noiseLabel,
  thermalRating,
  performanceTier,
} from "./estimates";
export type {
  EstimateLine,
  NoiseEstimate,
  NoiseLabel,
  ThermalEstimate,
  ThermalRating,
  ComponentThermal,
  PerformanceEstimate,
  PerformanceTier,
  Bottleneck,
} from "./estimates";
export { SCENE_THEMES, DEFAULT_SCENE_THEME, getSceneTheme } from "./sceneTheme";
export type { SceneTheme, SceneThemeName } from "./sceneTheme";
export { parseCameraState, cameraFromWorkspaceState } from "./cameraState";
export type { CameraState, Vec3 } from "./cameraState";
export { ESSENTIAL_CATEGORIES, summarizeBuild } from "./buildSummary";
export type { BuildSummary, SummaryLine, SummaryReport } from "./buildSummary";
export { resolveComponentAsset } from "./resolveComponentAsset";
export type { PlacedComponentAsset, AssetResolution } from "./resolveComponentAsset";
