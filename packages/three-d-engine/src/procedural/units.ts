// All component specs are stored in millimeters (see component-models' spec
// schemas). Three.js has no inherent unit, but the convention across this
// package is 1 scene unit = 1 meter, so every generator converts its inputs
// through this helper rather than each picking its own scale ad hoc — that
// keeps every generated model proportionally correct relative to every other
// one in the same scene.
export const MM_PER_SCENE_UNIT = 1000;

export function mm(value: number): number {
  return value / MM_PER_SCENE_UNIT;
}
