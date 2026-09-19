import { randomUUID } from "node:crypto";
import { prisma } from "@pcbuilder/database";
import { setSession, type TestSessionUser } from "./session";

export const RUN_ID = randomUUID().slice(0, 8);

// Every row a test creates carries this prefix so cleanup can find it without
// touching the seeded catalog or anyone else's data.
export const TEST_PREFIX = `t-${RUN_ID}`;

export function jsonRequest(method: string, body?: unknown, url = "http://test.local/api") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function getRequest(url: string) {
  return new Request(`http://test.local${url}`);
}

export const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });

export async function readJson(response: Response) {
  return (await response.json()) as { data: any; error: { message: string; issues?: any } | null };
}

export async function createUser(role: TestSessionUser["role"] = "USER", label = role.toLowerCase()) {
  const email = `${TEST_PREFIX}-${label}-${randomUUID().slice(0, 6)}@test.local`;
  const user = await prisma.user.create({ data: { email, passwordHash: "not-a-real-hash", role } });
  return { id: user.id, email, role } satisfies TestSessionUser;
}

export function loginAs(user: TestSessionUser | null) {
  setSession(user);
}

// Looks a seeded component up by SKU (the seed script is the source of truth
// for the catalog every test can rely on).
export async function componentBySku(sku: string) {
  const component = await prisma.component.findUnique({ where: { sku } });
  if (!component) throw new Error(`Seed component ${sku} missing — did the test database seed run?`);
  return component;
}

export async function cleanupTestData() {
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } }); // cascades builds
  await prisma.component.deleteMany({ where: { sku: { startsWith: TEST_PREFIX } } });
  await prisma.brand.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
}
