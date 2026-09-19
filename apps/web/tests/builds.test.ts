import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@pcbuilder/database";
import { GET as listBuilds, POST as createBuild } from "@/app/api/builds/route";
import { DELETE as deleteBuild, GET as getBuild, PATCH as patchBuild } from "@/app/api/builds/[id]/route";
import { POST as duplicateBuild } from "@/app/api/builds/[id]/duplicate/route";
import { POST as shareBuild } from "@/app/api/builds/[id]/share/route";
import {
  cleanupTestData,
  componentBySku,
  createUser,
  jsonRequest,
  loginAs,
  readJson,
  routeParams,
} from "./helpers";

let owner: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;
let rows: { componentId: string; installedZoneKey: string }[];

beforeAll(async () => {
  owner = await createUser("USER", "owner");
  stranger = await createUser("USER", "stranger");
  const [mobo, ram, pcCase] = await Promise.all([
    componentBySku("MB-ASUS-B650A"),
    componentBySku("RAM-CORSAIR-VENGEANCE-32GB-DDR5"),
    componentBySku("CASE-NZXT-H510"),
  ]);
  rows = [
    { componentId: pcCase.id, installedZoneKey: "UNPLACED" },
    { componentId: mobo.id, installedZoneKey: "MOBO_TRAY" },
    { componentId: ram.id, installedZoneKey: "RAM_SLOT_1" },
    { componentId: ram.id, installedZoneKey: "UNPLACED" },
  ];
});
afterAll(cleanupTestData);

const camera = { position: [0.9, 0.6, 1.2], target: [0, 0.22, 0] };

describe("authentication", () => {
  it("every builds route returns 401 without a session", async () => {
    expect((await listBuilds()).status).toBe(401);
    expect((await createBuild(jsonRequest("POST", { name: "x" }))).status).toBe(401);
    expect((await getBuild(jsonRequest("GET"), routeParams("x"))).status).toBe(401);
    expect((await patchBuild(jsonRequest("PATCH", {}), routeParams("x"))).status).toBe(401);
    expect((await deleteBuild(jsonRequest("DELETE"), routeParams("x"))).status).toBe(401);
    expect((await duplicateBuild(jsonRequest("POST"), routeParams("x"))).status).toBe(401);
    expect((await shareBuild(jsonRequest("POST", { enabled: true }), routeParams("x"))).status).toBe(401);
  });
});

describe("build lifecycle", () => {
  let buildId: string;

  it("creates a build with components, a compatibility snapshot and power estimate", async () => {
    loginAs(owner);
    const response = await createBuild(
      jsonRequest("POST", { name: "  My build  ", rows, workspaceState: { camera } }),
    );
    const { data } = await readJson(response);

    expect(response.status).toBe(201);
    buildId = data.id;
    expect(data.name).toBe("My build"); // trimmed
    expect(data.userId).toBe(owner.id);
    expect(data.isShared).toBe(false);
    expect(data.shareSlug).toBeNull();
    expect(typeof data.estimatedPowerWatts).toBe("number");
    expect(data.compatibilityStatus.overallStatus).toBeDefined();
    expect(data.workspaceState).toEqual({ camera });
    expect(await prisma.buildComponent.count({ where: { buildId } })).toBe(4);
  });

  it("validates input: missing/blank name, bad rows, unknown components", async () => {
    loginAs(owner);
    for (const body of [{}, { name: "   " }, { name: "x", rows: [{ componentId: "" }] }]) {
      expect((await createBuild(jsonRequest("POST", body))).status).toBe(400);
    }
    const unknown = await createBuild(
      jsonRequest("POST", { name: "ghost", rows: [{ componentId: "nope", installedZoneKey: "X" }] }),
    );
    expect(unknown.status).toBe(400);
    expect((await readJson(unknown)).error?.message).toMatch(/no longer exist/);
  });

  it("gets a build with its components, categories and 3D assets", async () => {
    loginAs(owner);
    const { data } = await readJson(await getBuild(jsonRequest("GET"), routeParams(buildId)));
    expect(data.components).toHaveLength(4);
    const first = data.components[0].component;
    expect(first.category.key).toBeTruthy();
    expect(first.brand.name).toBeTruthy();
    expect(Array.isArray(first.threeDAssets)).toBe(true);
  });

  it("lists only my builds, newest first, with a component count", async () => {
    loginAs(owner);
    const { data } = await readJson(await listBuilds());
    expect(data.map((build: any) => build.id)).toContain(buildId);
    expect(data[0]._count.components).toBeGreaterThanOrEqual(0);

    loginAs(stranger);
    expect((await readJson(await listBuilds())).data).toEqual([]);
  });

  it("renames without touching components", async () => {
    loginAs(owner);
    const response = await patchBuild(jsonRequest("PATCH", { name: "Renamed" }), routeParams(buildId));
    expect((await readJson(response)).data.name).toBe("Renamed");
    expect(await prisma.buildComponent.count({ where: { buildId } })).toBe(4);
  });

  it("replaces the whole component set and recomputes the snapshot", async () => {
    loginAs(owner);
    const response = await patchBuild(jsonRequest("PATCH", { rows: rows.slice(0, 2) }), routeParams(buildId));
    expect(response.status).toBe(200);
    expect(await prisma.buildComponent.count({ where: { buildId } })).toBe(2);
  });

  it("rejects a replacement with unknown components and leaves the build unchanged", async () => {
    loginAs(owner);
    const response = await patchBuild(
      jsonRequest("PATCH", { rows: [{ componentId: "nope", installedZoneKey: "X" }] }),
      routeParams(buildId),
    );
    expect(response.status).toBe(400);
    expect(await prisma.buildComponent.count({ where: { buildId } })).toBe(2);
  });

  it("stores only a valid camera; junk workspaceState is ignored", async () => {
    loginAs(owner);
    const newCamera = { position: [1, 1, 1], target: [0, 0, 0] };
    await patchBuild(jsonRequest("PATCH", { workspaceState: { camera: newCamera, evil: "<script>" } }), routeParams(buildId));
    expect((await prisma.pCBuild.findUniqueOrThrow({ where: { id: buildId } })).workspaceState).toEqual({ camera: newCamera });

    for (const junk of [
      { camera: { position: [1e9, 0, 0], target: [0, 0, 0] } },
      { camera: "nope" },
      { evil: true },
      "string",
    ]) {
      const response = await patchBuild(jsonRequest("PATCH", { workspaceState: junk }), routeParams(buildId));
      expect(response.status).toBe(200);
      expect((await prisma.pCBuild.findUniqueOrThrow({ where: { id: buildId } })).workspaceState).toEqual({ camera: newCamera });
    }
  });

  it("duplicates into a private copy owned by me", async () => {
    loginAs(owner);
    await shareBuild(jsonRequest("POST", { enabled: true }), routeParams(buildId));
    const response = await duplicateBuild(jsonRequest("POST"), routeParams(buildId));
    const { data } = await readJson(response);

    expect(response.status).toBe(201);
    expect(data.id).not.toBe(buildId);
    expect(data.name).toBe("Renamed (copy)");
    expect(data.isShared).toBe(false);
    expect(data.shareSlug).toBeNull();
    expect(await prisma.buildComponent.count({ where: { buildId: data.id } })).toBe(2);
    await shareBuild(jsonRequest("POST", { enabled: false }), routeParams(buildId));
  });

  it("deletes a build and its components (cascade), then 404s", async () => {
    loginAs(owner);
    const throwaway = await readJson(await createBuild(jsonRequest("POST", { name: "temp", rows })));
    const id = throwaway.data.id;

    expect((await deleteBuild(jsonRequest("DELETE"), routeParams(id))).status).toBe(200);
    expect(await prisma.buildComponent.count({ where: { buildId: id } })).toBe(0);
    expect((await getBuild(jsonRequest("GET"), routeParams(id))).status).toBe(404);
    expect((await deleteBuild(jsonRequest("DELETE"), routeParams(id))).status).toBe(404);
  });

  describe("ownership isolation", () => {
    it("another user gets 404 (not 403) for get, patch, delete, duplicate and share", async () => {
      loginAs(stranger);
      expect((await getBuild(jsonRequest("GET"), routeParams(buildId))).status).toBe(404);
      expect((await patchBuild(jsonRequest("PATCH", { name: "hacked" }), routeParams(buildId))).status).toBe(404);
      expect((await deleteBuild(jsonRequest("DELETE"), routeParams(buildId))).status).toBe(404);
      expect((await duplicateBuild(jsonRequest("POST"), routeParams(buildId))).status).toBe(404);
      expect((await shareBuild(jsonRequest("POST", { enabled: true }), routeParams(buildId))).status).toBe(404);

      const untouched = await prisma.pCBuild.findUniqueOrThrow({ where: { id: buildId } });
      expect(untouched.name).toBe("Renamed");
      expect(untouched.isShared).toBe(false);
    });

    it("even an ADMIN cannot read another user's private build through these routes", async () => {
      const admin = await createUser("ADMIN");
      loginAs(admin);
      expect((await getBuild(jsonRequest("GET"), routeParams(buildId))).status).toBe(404);
    });
  });

  describe("sharing", () => {
    it("enables with an unguessable slug, is idempotent, and disables by clearing the slug", async () => {
      loginAs(owner);
      const first = await readJson(await shareBuild(jsonRequest("POST", { enabled: true }), routeParams(buildId)));
      expect(first.data.isShared).toBe(true);
      expect(first.data.shareSlug).toMatch(/^[A-Za-z0-9_-]{12}$/);

      const second = await readJson(await shareBuild(jsonRequest("POST", { enabled: true }), routeParams(buildId)));
      expect(second.data.shareSlug).toBe(first.data.shareSlug);

      const off = await readJson(await shareBuild(jsonRequest("POST", { enabled: false }), routeParams(buildId)));
      expect(off.data).toEqual({ isShared: false, shareSlug: null });

      const again = await readJson(await shareBuild(jsonRequest("POST", { enabled: true }), routeParams(buildId)));
      expect(again.data.shareSlug).not.toBe(first.data.shareSlug); // old link stays dead
      await shareBuild(jsonRequest("POST", { enabled: false }), routeParams(buildId));
    });

    it("rejects a malformed body", async () => {
      loginAs(owner);
      expect((await shareBuild(jsonRequest("POST", { enabled: "yes" }), routeParams(buildId))).status).toBe(400);
      expect((await shareBuild(jsonRequest("POST", {}), routeParams(buildId))).status).toBe(400);
    });
  });
});
