import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@pcbuilder/database";
import { POST as createComponent } from "@/app/api/components/route";
import { DELETE as deleteComponent, PATCH as patchComponent } from "@/app/api/components/[id]/route";
import { POST as createBrand } from "@/app/api/brands/route";
import { DELETE as deleteBrand } from "@/app/api/brands/[id]/route";
import { POST as updateInventory } from "@/app/api/inventory/update/route";
import { GET as getInventory } from "@/app/api/inventory/route";
import {
  TEST_PREFIX,
  cleanupTestData,
  createUser,
  jsonRequest,
  loginAs,
  readJson,
  routeParams,
} from "./helpers";

let admin: Awaited<ReturnType<typeof createUser>>;
let manager: Awaited<ReturnType<typeof createUser>>;
let regularUser: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  admin = await createUser("ADMIN");
  manager = await createUser("INVENTORY_MANAGER");
  regularUser = await createUser("USER");
});
afterAll(cleanupTestData);

const validFan = (sku: string) => ({
  sku,
  categoryKey: "FAN",
  brandName: `${TEST_PREFIX}-brand`,
  model: "Test Fan 120",
  price: 12.5,
  specifications: { sizeMm: 120, rpm: 1500, bladeDirection: "Forward Blade" },
});

describe("admin component management", () => {
  const sku = `${TEST_PREFIX}-FAN-1`;
  let createdId: string;

  it("requires authentication (401) and an admin-ish role (403)", async () => {
    expect((await createComponent(jsonRequest("POST", validFan(sku)))).status).toBe(401);

    loginAs(regularUser);
    expect((await createComponent(jsonRequest("POST", validFan(sku)))).status).toBe(403);
  });

  it("creates a component (upserting its brand) with an Inventory row and derived hot fields", async () => {
    loginAs(manager);
    const response = await createComponent(jsonRequest("POST", validFan(sku)));
    const { data } = await readJson(response);

    expect(response.status).toBe(201);
    createdId = data.id;
    expect(data.category.key).toBe("FAN");
    expect(data.brand.name).toBe(`${TEST_PREFIX}-brand`);
    expect(Number(data.price)).toBe(12.5);

    const inventory = await prisma.inventory.findUnique({ where: { componentId: createdId } });
    expect(inventory?.stockQuantity).toBe(0);
  });

  it("returns 409 for a duplicate SKU", async () => {
    loginAs(admin);
    expect((await createComponent(jsonRequest("POST", validFan(sku)))).status).toBe(409);
  });

  it("validates specifications against the category schema (400 with issues)", async () => {
    loginAs(admin);
    const response = await createComponent(
      jsonRequest("POST", { ...validFan(`${sku}-bad`), specifications: { sizeMm: -5 } }),
    );
    expect(response.status).toBe(400);
    expect((await readJson(response)).error?.issues).toBeDefined();
    expect(await prisma.component.findUnique({ where: { sku: `${sku}-bad` } })).toBeNull();
  });

  it("returns 400 for an unknown category", async () => {
    loginAs(admin);
    const response = await createComponent(
      jsonRequest("POST", { ...validFan(`${sku}-cat`), categoryKey: "NOT_A_CATEGORY" }),
    );
    expect(response.status).toBe(400);
  });

  it("patches editable fields and re-validates specifications", async () => {
    loginAs(admin);
    const ok = await patchComponent(
      jsonRequest("PATCH", { price: 15, specifications: { sizeMm: 140, bladeDirection: "Reverse Blade" } }),
      routeParams(createdId),
    );
    expect(ok.status).toBe(200);
    expect(Number((await readJson(ok)).data.price)).toBe(15);

    const bad = await patchComponent(
      jsonRequest("PATCH", { specifications: { sizeMm: "big" } }),
      routeParams(createdId),
    );
    expect(bad.status).toBe(400);

    const missing = await patchComponent(jsonRequest("PATCH", { price: 1 }), routeParams("nope"));
    expect(missing.status).toBe(404);

    loginAs(regularUser);
    expect((await patchComponent(jsonRequest("PATCH", { price: 1 }), routeParams(createdId))).status).toBe(403);
  });

  it("refuses to delete a component that a saved build uses (409), then deletes it once free", async () => {
    const owner = await createUser("USER", "owner");
    const build = await prisma.pCBuild.create({
      data: { userId: owner.id, name: "uses fan", components: { create: [{ componentId: createdId, installedZoneKey: "UNPLACED" }] } },
    });

    loginAs(admin);
    expect((await deleteComponent(jsonRequest("DELETE"), routeParams(createdId))).status).toBe(409);

    await prisma.pCBuild.delete({ where: { id: build.id } });
    expect((await deleteComponent(jsonRequest("DELETE"), routeParams(createdId))).status).toBe(200);
    expect((await deleteComponent(jsonRequest("DELETE"), routeParams(createdId))).status).toBe(404);
  });
});

describe("brands", () => {
  it("creates (409 on duplicate) and refuses to delete a brand still in use", async () => {
    loginAs(admin);
    const name = `${TEST_PREFIX}-brand-b`;
    const created = await createBrand(jsonRequest("POST", { name }));
    expect(created.status).toBe(201);
    expect((await createBrand(jsonRequest("POST", { name }))).status).toBe(409);

    loginAs(regularUser);
    expect((await createBrand(jsonRequest("POST", { name: `${name}2` }))).status).toBe(403);

    loginAs(admin);
    const brand = await prisma.brand.findUniqueOrThrow({ where: { name } });
    await prisma.component.create({
      data: {
        sku: `${TEST_PREFIX}-brand-user`,
        model: "x",
        price: 1,
        images: [],
        specifications: {},
        category: { connect: { key: "FAN" } },
        brand: { connect: { id: brand.id } },
      },
    });
    expect((await deleteBrand(jsonRequest("DELETE"), routeParams(brand.id))).status).toBe(409);
    await prisma.component.delete({ where: { sku: `${TEST_PREFIX}-brand-user` } });
    expect((await deleteBrand(jsonRequest("DELETE"), routeParams(brand.id))).status).toBe(200);
  });
});

describe("inventory", () => {
  it("GET /api/inventory is admin/inventory-manager only", async () => {
    expect((await getInventory()).status).toBe(401);
    loginAs(regularUser);
    expect((await getInventory()).status).toBe(403);

    loginAs(manager);
    const response = await getInventory();
    const { data } = await readJson(response);
    expect(response.status).toBe(200);
    expect(data.totalComponents).toBeGreaterThanOrEqual(20);
    expect(Array.isArray(data.lowStockComponents)).toBe(true);
    expect(Array.isArray(data.outOfStockComponents)).toBe(true);
  });

  it("POST /api/inventory/update adjusts stock, stamps lastRestockedAt, and reports low stock", async () => {
    const component = await prisma.component.findUniqueOrThrow({ where: { sku: "FAN-NOCTUA-NF-A12X25" } });
    const before = await prisma.inventory.findUniqueOrThrow({ where: { componentId: component.id } });

    try {
      loginAs(regularUser);
      expect((await updateInventory(jsonRequest("POST", { componentId: component.id, stockQuantity: 1 }))).status).toBe(403);

      loginAs(admin);
      const response = await updateInventory(
        jsonRequest("POST", { componentId: component.id, stockQuantity: 1, lowStockThreshold: 5 }),
      );
      const { data } = await readJson(response);
      expect(response.status).toBe(200);
      expect(data.stockQuantity).toBe(1);
      expect(data.lastRestockedAt).toBeTruthy();

      const overview = await readJson(await getInventory());
      expect(overview.data.lowStockComponents.map((row: any) => row.id)).toContain(component.id);

      expect((await updateInventory(jsonRequest("POST", { componentId: component.id, stockQuantity: -3 }))).status).toBe(400);
      expect((await updateInventory(jsonRequest("POST", { componentId: "nope", stockQuantity: 3 }))).status).toBe(404);
    } finally {
      await prisma.inventory.update({
        where: { componentId: component.id },
        data: { stockQuantity: before.stockQuantity, lowStockThreshold: before.lowStockThreshold },
      });
    }
  });
});
