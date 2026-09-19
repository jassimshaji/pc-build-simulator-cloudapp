// Pure conversion between the workspace's in-memory build shape (a quantity
// per component + a zone -> component placement map) and the flat
// `BuildComponent` row shape the database stores (one row per physical unit,
// with the zone it's installed into). Framework/DB-agnostic on purpose, like
// the rest of this package's logic, so it's Vitest-testable without Prisma.

// `BuildComponent.installedZoneKey` is a required column, so units that are in
// the build but not click-placed into a 3D zone (including the case, which is
// the root container rather than a zone occupant) use this sentinel.
export const UNPLACED_ZONE_KEY = "UNPLACED";

export interface BuildLineRef {
  componentId: string;
  quantity: number;
}

export interface BuildRow {
  componentId: string;
  installedZoneKey: string;
}

export interface DeserializedBuild {
  lines: BuildLineRef[];
  placements: Record<string, string>; // zoneKey -> componentId
}

export function serializeBuild(
  lines: BuildLineRef[],
  placements: Record<string, { componentId: string }>,
): BuildRow[] {
  const rows: BuildRow[] = [];
  const placedCount = new Map<string, number>();

  for (const [zoneKey, placed] of Object.entries(placements)) {
    rows.push({ componentId: placed.componentId, installedZoneKey: zoneKey });
    placedCount.set(placed.componentId, (placedCount.get(placed.componentId) ?? 0) + 1);
  }

  for (const line of lines) {
    const unplaced = line.quantity - (placedCount.get(line.componentId) ?? 0);
    for (let i = 0; i < unplaced; i++) {
      rows.push({ componentId: line.componentId, installedZoneKey: UNPLACED_ZONE_KEY });
    }
  }

  return rows;
}

export function deserializeBuild(rows: BuildRow[]): DeserializedBuild {
  const quantities = new Map<string, number>();
  const placements: Record<string, string> = {};

  for (const row of rows) {
    quantities.set(row.componentId, (quantities.get(row.componentId) ?? 0) + 1);
    if (row.installedZoneKey !== UNPLACED_ZONE_KEY) {
      placements[row.installedZoneKey] = row.componentId;
    }
  }

  return {
    lines: [...quantities].map(([componentId, quantity]) => ({ componentId, quantity })),
    placements,
  };
}
