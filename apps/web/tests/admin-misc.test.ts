import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, prisma } from "@pcbuilder/database";
import { GET as exportComponents } from "@/app/api/components/export/route";
import { POST as importComponents } from "@/app/api/components/import/route";
import { POST as createCategory } from "@/app/api/components/categories/route";
import { DELETE as deleteCategory, PATCH as patchCategory } from "@/app/api/components/categories/[id]/route";
import { PUT as putAsset } from "@/app/api/components/[id]/asset/route";
import { POST as requestUpload } from "@/app/api/assets/route";
import { MAX_MODEL_UPLOAD_BYTES, MAX_UPLOAD_BYTES } from "@/lib/storage";
import {
  TEST_PREFIX,
  cleanupTestData,
  componentBySku,
  createUser,
  jsonRequest,
  loginAs,
  readJson,
  routeParams,
} from "./helpers";

let admin: Awaited<ReturnType<typeof createUser>>;
let regularUser: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  admin = await createUser("ADMIN");
  regularUser = await createUser("USER");
});
afterAll(async () => {
  await prisma.componentCategory.deleteMany({ where: { key: { startsWith: "TEST_" } } });
  await cleanupTestData();
});

describe("category management", () => {
  let categoryId: string;

  it("creates a UPPER_SNAKE_CASE category (admin only), rejecting bad keys and duplicates", async () => {
    expect((await createCategory(jsonRequest("POST", { key: "TEST_HDD", label: "HDD" }))).status).toBe(401);
    loginAs(regularUser);
    expect((await createCategory(jsonRequest("POST", { key: "TEST_HDD", label: "HDD" }))).status).toBe(403);

    loginAs(admin);
    for (const key of ["lowercase", "1STARTS_WITH_DIGIT", "HAS SPACE"]) {
      expect((await createCategory(jsonRequest("POST", { key, label: "x" }))).status).toBe(400);
    }
    const created = await createCategory(jsonRequest("POST", { key: "TEST_HDD", label: "HDD", sortOrder: 999 }));
    expect(created.status).toBe(201);
    categoryId = (await readJson(created)).data.id;
    expect((await createCategory(jsonRequest("POST", { key: "TEST_HDD", label: "again" }))).status).toBe(409);
  });

  it("patches label/sortOrder but never the immutable key", async () => {
    loginAs(admin);
    const response = await patchCategory(jsonRequest("PATCH", { label: "Hard Drive", key: "TEST_RENAMED" }), routeParams(categoryId));
    const { data } = await readJson(response);
    expect(data.label).toBe("Hard Drive");
    expect(data.key).toBe("TEST_HDD");
    expect((await patchCategory(jsonRequest("PATCH", { label: "x" }), routeParams("nope"))).status).toBe(404);
  });

  it("refuses to delete a category that components use, and deletes an unused one", async () => {
    loginAs(admin);
    const cpu = await prisma.componentCategory.findUniqueOrThrow({ where: { key: "CPU" } });
    expect((await deleteCategory(jsonRequest("DELETE"), routeParams(cpu.id))).status).toBe(409);

    expect((await deleteCategory(jsonRequest("DELETE"), routeParams(categoryId))).status).toBe(200);
    expect((await deleteCategory(jsonRequest("DELETE"), routeParams(categoryId))).status).toBe(404);
  });
});

describe("3D asset assignment", () => {
  it("validates per-kind requirements and upserts a single slot with full-replace semantics", async () => {
    const component = await componentBySku("FAN-NOCTUA-NF-A12X25");
    const original = await prisma.threeDAsset.findMany({ where: { componentId: component.id } });

    try {
      loginAs(regularUser);
      expect((await putAsset(jsonRequest("PUT", { kind: "PLACEHOLDER" }), routeParams(component.id))).status).toBe(403);

      loginAs(admin);
      expect((await putAsset(jsonRequest("PUT", { kind: "GLTF_MODEL" }), routeParams(component.id))).status).toBe(400);
      expect((await putAsset(jsonRequest("PUT", { kind: "PROCEDURAL_FALLBACK" }), routeParams(component.id))).status).toBe(400);
      expect((await putAsset(jsonRequest("PUT", { kind: "PLACEHOLDER" }), routeParams("nope"))).status).toBe(404);

      const gltf = await putAsset(
        jsonRequest("PUT", { kind: "GLTF_MODEL", url: "http://127.0.0.1:8333/pc-builder-assets/models/x.glb", source: "test" }),
        routeParams(component.id),
      );
      expect(gltf.status).toBe(200);
      expect((await readJson(gltf)).data.kind).toBe("GLTF_MODEL");

      const replaced = await putAsset(jsonRequest("PUT", { kind: "PLACEHOLDER" }), routeParams(component.id));
      const { data } = await readJson(replaced);
      expect(data.kind).toBe("PLACEHOLDER");
      expect(data.url).toBeNull(); // PUT replaces: the old url is cleared
      expect(data.source).toBeNull();
      expect(await prisma.threeDAsset.count({ where: { componentId: component.id } })).toBe(original.length || 1);
    } finally {
      await prisma.threeDAsset.deleteMany({ where: { componentId: component.id } });
      for (const asset of original) {
        await prisma.threeDAsset.create({
          data: { ...asset, usageRights: asset.usageRights === null ? Prisma.JsonNull : asset.usageRights },
        });
      }
    }
  });
});

describe("POST /api/assets (presigned uploads)", () => {
  it("requires an admin/inventory role", async () => {
    const body = { filename: "a.png", contentType: "image/png", size: 1024 };
    expect((await requestUpload(jsonRequest("POST", body))).status).toBe(401);
    loginAs(regularUser);
    expect((await requestUpload(jsonRequest("POST", body))).status).toBe(403);
  });

  it("returns a presigned PUT url, a public url and a sanitized key", async () => {
    loginAs(admin);
    const response = await requestUpload(
      jsonRequest("POST", { filename: "../my photo?.png", contentType: "image/png", size: 2048 }),
    );
    const { data } = await readJson(response);

    expect(response.status).toBe(200);
    expect(data.uploadUrl).toContain("X-Amz-Signature=");
    // The declared size is enforced by storage because content-length is signed.
    expect(new URL(data.uploadUrl).searchParams.get("X-Amz-SignedHeaders")).toContain("content-length");
    expect(data.key).toMatch(/^components\/[0-9a-f-]{36}-/);
    // Nothing in the filename can add path segments or query characters: after
    // the "components/" prefix there is no slash, backslash, "?" or space.
    expect(data.key.slice("components/".length)).not.toMatch(/[/\\? ]/);
    expect(data.publicUrl.endsWith(data.key)).toBe(true);
  });

  it("uses a models/ prefix for model uploads and checks content types per purpose", async () => {
    loginAs(admin);
    const model = await requestUpload(
      jsonRequest("POST", { filename: "case.glb", contentType: "model/gltf-binary", purpose: "model", size: 4096 }),
    );
    expect((await readJson(model)).data.key).toMatch(/^models\//);

    const wrongForImage = await requestUpload(
      jsonRequest("POST", { filename: "a.glb", contentType: "model/gltf-binary", size: 4096 }),
    );
    expect(wrongForImage.status).toBe(400);
    const wrongForModel = await requestUpload(
      jsonRequest("POST", { filename: "a.png", contentType: "image/png", purpose: "model", size: 4096 }),
    );
    expect(wrongForModel.status).toBe(400);
    expect((await requestUpload(jsonRequest("POST", { filename: "a.png" }))).status).toBe(400);
  });

  it("requires a size and rejects files over the per-purpose limit with 413", async () => {
    loginAs(admin);
    const noSize = await requestUpload(jsonRequest("POST", { filename: "a.png", contentType: "image/png" }));
    expect(noSize.status).toBe(400);

    const bigImage = await requestUpload(
      jsonRequest("POST", { filename: "a.png", contentType: "image/png", size: MAX_UPLOAD_BYTES + 1 }),
    );
    expect(bigImage.status).toBe(413);
    const okImage = await requestUpload(
      jsonRequest("POST", { filename: "a.png", contentType: "image/png", size: MAX_UPLOAD_BYTES }),
    );
    expect(okImage.status).toBe(200);

    // Models get the larger allowance.
    const bigModel = await requestUpload(
      jsonRequest("POST", {
        filename: "a.glb",
        contentType: "model/gltf-binary",
        purpose: "model",
        size: MAX_UPLOAD_BYTES + 1,
      }),
    );
    expect(bigModel.status).toBe(200);
    const hugeModel = await requestUpload(
      jsonRequest("POST", {
        filename: "a.glb",
        contentType: "model/gltf-binary",
        purpose: "model",
        size: MAX_MODEL_UPLOAD_BYTES + 1,
      }),
    );
    expect(hugeModel.status).toBe(413);
  });
});

describe("CSV export / import", () => {
  it("export is admin-only and returns an attachment with every column", async () => {
    expect((await exportComponents()).status).toBe(401);
    loginAs(regularUser);
    expect((await exportComponents()).status).toBe(403);

    loginAs(admin);
    const response = await exportComponents();
    const csv = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    const header = csv.split(/\r?\n/)[0];
    expect(header).toBe(
      "sku,categoryKey,brandName,model,price,description,images,isAvailable,stockQuantity,lowStockThreshold,specifications",
    );
    expect(csv).toContain("CPU-AMD-7800X3D");
  });

  it("round-trips: an unchanged export re-imports as pure updates with no failures", async () => {
    loginAs(admin);
    const csv = await (await exportComponents()).text();
    const form = new FormData();
    form.set("file", new File([csv], "components.csv", { type: "text/csv" }));

    const response = await importComponents(new Request("http://test.local/api", { method: "POST", body: form }));
    const { data } = await readJson(response);
    expect(response.status).toBe(200);
    expect(data.failed).toEqual([]);
    expect(data.created).toBe(0);
    expect(data.updated).toBe(data.total);
  });

  it("creates new SKUs, updates existing ones, and reports bad rows without aborting", async () => {
    loginAs(admin);
    const cpu = await componentBySku("CPU-AMD-7800X3D");
    const specs = (JSON.stringify({ sizeMm: 120, bladeDirection: "Forward Blade" })).replace(/"/g, '""');
    const header = "sku,categoryKey,brandName,model,price,description,images,isAvailable,stockQuantity,lowStockThreshold,specifications";
    const csv = [
      header,
      `${TEST_PREFIX}-IMPORT-OK,FAN,${TEST_PREFIX}-brand,Imported Fan,9.99,,[],true,7,2,"${specs}"`,
      `${TEST_PREFIX}-IMPORT-BADCAT,NOPE,${TEST_PREFIX}-brand,Bad,1,,[],true,1,1,"{}"`,
      `${TEST_PREFIX}-IMPORT-BADPRICE,FAN,${TEST_PREFIX}-brand,Bad,abc,,[],true,1,1,"${specs}"`,
      `${TEST_PREFIX}-IMPORT-BADSPEC,FAN,${TEST_PREFIX}-brand,Bad,1,,[],true,1,1,"{""sizeMm"":-1}"`,
    ].join("\r\n");
    const form = new FormData();
    form.set("file", new File([csv], "c.csv", { type: "text/csv" }));

    const { data } = await readJson(
      await importComponents(new Request("http://test.local/api", { method: "POST", body: form })),
    );

    expect(data.total).toBe(4);
    expect(data.created).toBe(1);
    expect(data.failed.map((failure: any) => failure.row)).toEqual([3, 4, 5]); // header is row 1
    const created = await componentBySku(`${TEST_PREFIX}-IMPORT-OK`);
    expect(Number(created.price)).toBe(9.99);
    expect((await prisma.inventory.findUniqueOrThrow({ where: { componentId: created.id } })).stockQuantity).toBe(7);
    expect((await componentBySku("CPU-AMD-7800X3D")).id).toBe(cpu.id); // untouched
  });

  it("rejects a request with no file, and non-admins", async () => {
    loginAs(admin);
    expect((await importComponents(new Request("http://test.local/api", { method: "POST", body: new FormData() }))).status).toBe(400);
    loginAs(regularUser);
    const form = new FormData();
    form.set("file", new File(["x"], "c.csv"));
    expect((await importComponents(new Request("http://test.local/api", { method: "POST", body: form }))).status).toBe(403);
  });
});
