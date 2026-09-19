import { afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@pcbuilder/database";
import { POST } from "@/app/api/auth/register/route";
import { TEST_PREFIX, cleanupTestData, jsonRequest, readJson } from "./helpers";

afterAll(cleanupTestData);

const email = `${TEST_PREFIX}-register@test.local`;

describe("POST /api/auth/register", () => {
  it("creates a USER with a hashed password and returns 201", async () => {
    const response = await POST(jsonRequest("POST", { email, password: "password123", name: "Tester" }));
    const body = await readJson(response);

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.email).toBe(email);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.role).toBe("USER");
    expect(stored.passwordHash).not.toBe("password123");
    expect(await bcrypt.compare("password123", stored.passwordHash)).toBe(true);
    expect(JSON.stringify(body)).not.toContain(stored.passwordHash);
  });

  it("returns 409 for a duplicate email", async () => {
    const response = await POST(jsonRequest("POST", { email, password: "password123" }));
    expect(response.status).toBe(409);
  });

  it("returns 400 for a short password, bad email, or missing body", async () => {
    for (const body of [
      { email: `${TEST_PREFIX}-x@test.local`, password: "short" },
      { email: "not-an-email", password: "password123" },
      {},
    ]) {
      const response = await POST(jsonRequest("POST", body));
      expect(response.status).toBe(400);
      expect((await readJson(response)).error?.issues).toBeDefined();
    }
    const noBody = await POST(new Request("http://test.local/api", { method: "POST" }));
    expect(noBody.status).toBe(400);
  });

  it("never lets a client choose its own role", async () => {
    const roleEmail = `${TEST_PREFIX}-sneaky@test.local`;
    await POST(jsonRequest("POST", { email: roleEmail, password: "password123", role: "ADMIN" }));
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: roleEmail } });
    expect(stored.role).toBe("USER");
  });
});
