import { describe, expect, it } from "vitest";
import { GET as listComponents } from "@/app/api/components/route";
import { GET as getComponent } from "@/app/api/components/[id]/route";
import { GET as listCategories } from "@/app/api/components/categories/route";
import { GET as listBrands } from "@/app/api/brands/route";
import { componentBySku, getRequest, readJson, routeParams } from "./helpers";

describe("GET /api/components", () => {
  it("returns the seeded catalog with relations and pagination metadata", async () => {
    const response = await listComponents(getRequest("/api/components?limit=100"));
    const { data } = await readJson(response);

    expect(response.status).toBe(200);
    expect(data.total).toBeGreaterThanOrEqual(20);
    expect(data.page).toBe(1);
    const item = data.items[0];
    expect(item.category.key).toBeTruthy();
    expect(item.brand.name).toBeTruthy();
    expect(item).toHaveProperty("inventory");
    expect(item).toHaveProperty("threeDAssets");
  });

  it("filters by category key", async () => {
    const { data } = await readJson(await listComponents(getRequest("/api/components?category=CPU&limit=100")));
    expect(data.items.length).toBeGreaterThanOrEqual(2);
    expect(data.items.every((item: any) => item.category.key === "CPU")).toBe(true);
  });

  it("filters by brand and by case-insensitive model text", async () => {
    const byBrand = await readJson(await listComponents(getRequest("/api/components?brand=NZXT&limit=100")));
    expect(byBrand.data.items.length).toBeGreaterThan(0);
    expect(byBrand.data.items.every((item: any) => item.brand.name === "NZXT")).toBe(true);

    const byText = await readJson(await listComponents(getRequest("/api/components?q=ryzen")));
    expect(byText.data.items.map((item: any) => item.model)).toContain("Ryzen 7 7800X3D");
  });

  it("filters by price range", async () => {
    const { data } = await readJson(await listComponents(getRequest("/api/components?minPrice=1000&limit=100")));
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items.every((item: any) => Number(item.price) >= 1000)).toBe(true);
  });

  it("paginates", async () => {
    const first = await readJson(await listComponents(getRequest("/api/components?limit=5&page=1")));
    const second = await readJson(await listComponents(getRequest("/api/components?limit=5&page=2")));
    expect(first.data.items).toHaveLength(5);
    expect(first.data.totalPages).toBe(Math.ceil(first.data.total / 5));
    const firstIds = new Set(first.data.items.map((item: any) => item.id));
    expect(second.data.items.every((item: any) => !firstIds.has(item.id))).toBe(true);
  });

  it("rejects invalid query parameters with 400 and Zod issues", async () => {
    for (const query of ["minPrice=abc", "limit=1000", "page=0"]) {
      const response = await listComponents(getRequest(`/api/components?${query}`));
      expect(response.status).toBe(400);
      expect((await readJson(response)).error?.issues).toBeDefined();
    }
  });

  it("hides unavailable components", async () => {
    const { prisma } = await import("@pcbuilder/database");
    const component = await componentBySku("FAN-CORSAIR-LL120-REVERSE");
    await prisma.component.update({ where: { id: component.id }, data: { isAvailable: false } });
    try {
      const { data } = await readJson(await listComponents(getRequest("/api/components?category=FAN&limit=100")));
      expect(data.items.map((item: any) => item.id)).not.toContain(component.id);
    } finally {
      await prisma.component.update({ where: { id: component.id }, data: { isAvailable: true } });
    }
  });
});

describe("GET /api/components/:id", () => {
  it("returns one component with category, brand, inventory and 3D assets", async () => {
    const component = await componentBySku("CPU-AMD-7800X3D");
    const response = await getComponent(getRequest(`/api/components/${component.id}`), routeParams(component.id));
    const { data } = await readJson(response);

    expect(response.status).toBe(200);
    expect(data.model).toBe("Ryzen 7 7800X3D");
    expect(data.category.key).toBe("CPU");
    expect(data.inventory.stockQuantity).toBeGreaterThanOrEqual(0);
    expect(data.threeDAssets[0].kind).toBe("PROCEDURAL_FALLBACK");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await getComponent(getRequest("/api/components/nope"), routeParams("nope"));
    expect(response.status).toBe(404);
    expect((await readJson(response)).error?.message).toBe("Component not found.");
  });
});

describe("GET /api/components/categories and /api/brands", () => {
  it("lists all 12 categories in sortOrder", async () => {
    const { data } = await readJson(await listCategories());
    expect(data.map((category: any) => category.key)).toEqual([
      "CPU",
      "MOTHERBOARD",
      "GPU",
      "RAM",
      "SSD",
      "PSU",
      "CASE",
      "AIR_COOLER",
      "AIO_COOLER",
      "FAN",
      "MONITOR",
      "CASE_LCD",
    ]);
  });

  it("lists brands with component counts (public)", async () => {
    const { data } = await readJson(await listBrands());
    const nzxt = data.find((brand: any) => brand.name === "NZXT");
    expect(nzxt._count.components).toBeGreaterThanOrEqual(3);
  });
});
