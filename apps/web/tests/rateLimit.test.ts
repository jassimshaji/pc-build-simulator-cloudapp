import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@pcbuilder/database";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as requestUpload } from "@/app/api/assets/route";
import { authOptions } from "@/lib/auth";
import { RATE_LIMITS, clientIp, rateLimit, resetRateLimits } from "@/lib/rateLimit";
import { TEST_PREFIX, cleanupTestData, createUser, loginAs } from "./helpers";

function postFrom(ip: string, body: unknown) {
  return new Request("http://test.local/api", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

// The rest of the suite runs with the limiter off (vitest.config.ts); these
// tests turn it on for themselves.
beforeEach(() => {
  process.env.RATE_LIMIT_DISABLED = "false";
  resetRateLimits();
});
afterEach(() => {
  process.env.RATE_LIMIT_DISABLED = "true";
  resetRateLimits();
});
afterAll(cleanupTestData);

describe("rateLimit", () => {
  it("allows up to the limit, then blocks with a retry-after", () => {
    const { limit, windowMs } = RATE_LIMITS.register;
    for (let i = 0; i < limit; i++) expect(rateLimit("register", "1.1.1.1", 0).allowed).toBe(true);

    const blocked = rateLimit("register", "1.1.1.1", 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(Math.ceil((windowMs - 1000) / 1000));
  });

  it("counts each identifier and scope separately", () => {
    for (let i = 0; i < RATE_LIMITS.register.limit; i++) rateLimit("register", "1.1.1.1", 0);
    expect(rateLimit("register", "1.1.1.1", 0).allowed).toBe(false);
    expect(rateLimit("register", "2.2.2.2", 0).allowed).toBe(true);
    expect(rateLimit("login", "1.1.1.1", 0).allowed).toBe(true);
  });

  it("starts a fresh window once the old one has expired", () => {
    const { limit, windowMs } = RATE_LIMITS.register;
    for (let i = 0; i < limit + 1; i++) rateLimit("register", "1.1.1.1", 0);
    expect(rateLimit("register", "1.1.1.1", windowMs).allowed).toBe(true);
  });

  it("does nothing when disabled", () => {
    process.env.RATE_LIMIT_DISABLED = "true";
    for (let i = 0; i < RATE_LIMITS.register.limit * 3; i++) {
      expect(rateLimit("register", "1.1.1.1").allowed).toBe(true);
    }
  });

  it("reads the client address from the first x-forwarded-for entry", () => {
    const request = (headers: Record<string, string>) => new Request("http://test.local", { headers });
    expect(clientIp(request({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientIp(request({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIp(request({}))).toBe("unknown");
  });
});

describe("rate-limited routes", () => {
  it("POST /api/auth/register returns 429 with Retry-After after too many attempts", async () => {
    for (let i = 0; i < RATE_LIMITS.register.limit; i++) {
      // Invalid bodies still count: the limit protects the endpoint, not just successes.
      const response = await register(postFrom("7.7.7.7", {}));
      expect(response.status).toBe(400);
    }
    const limited = await register(postFrom("7.7.7.7", {}));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);

    const otherClient = await register(postFrom("6.6.6.6", {}));
    expect(otherClient.status).toBe(400);
  });

  it("POST /api/assets returns 429 once a user exceeds the upload limit", async () => {
    const admin = await createUser("ADMIN");
    loginAs(admin);
    const body = { filename: "a.png", contentType: "image/png", size: 1024 };
    for (let i = 0; i < RATE_LIMITS.upload.limit; i++) {
      expect((await requestUpload(postFrom("5.5.5.5", body))).status).toBe(200);
    }
    expect((await requestUpload(postFrom("5.5.5.5", body))).status).toBe(429);
  });

  it("sign-in stops verifying an email after too many attempts, even with the right password", async () => {
    const password = "correct-horse-battery";
    const passwordHash = await bcrypt.hash(password, 4);
    const makeUser = async (label: string) => {
      const email = `${TEST_PREFIX}-${label}@test.local`;
      await prisma.user.create({ data: { email, passwordHash } });
      return { email, password };
    };
    const user = await makeUser("login-a");
    const provider = authOptions.providers[0] as unknown as {
      options: { authorize: (credentials: Record<string, string>) => Promise<unknown> };
    };
    const authorize = provider.options.authorize;

    for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
      expect(await authorize({ email: user.email, password: "wrong-password" })).toBeNull();
    }
    expect(await authorize({ email: user.email, password: user.password })).toBeNull();

    // A different account is unaffected.
    const other = await makeUser("login-b");
    expect(await authorize({ email: other.email, password: other.password })).not.toBeNull();
  });
});
