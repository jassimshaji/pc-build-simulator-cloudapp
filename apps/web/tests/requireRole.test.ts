import { beforeEach, describe, expect, it, vi } from "vitest";

// The other API tests replace requireRole with a controllable stand-in; this
// file exercises the REAL implementation, with only next-auth's session lookup
// faked.
const getServerSession = vi.fn();
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

async function loadRealRequireRole() {
  const actual = await vi.importActual<typeof import("@/lib/requireRole")>("@/lib/requireRole");
  return actual.requireRole;
}

describe("requireRole (real implementation)", () => {
  beforeEach(() => getServerSession.mockReset());

  it("returns 401 when there is no session", async () => {
    getServerSession.mockResolvedValue(null);
    const requireRole = await loadRealRequireRole();
    expect(await requireRole(["ADMIN"])).toEqual({ ok: false, status: 401, message: "Not authenticated." });
  });

  it("returns 401 for a session without a user", async () => {
    getServerSession.mockResolvedValue({});
    const requireRole = await loadRealRequireRole();
    expect(await requireRole(["USER"])).toMatchObject({ ok: false, status: 401 });
  });

  it("returns 403 when the role isn't allowed", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u1", role: "USER" } });
    const requireRole = await loadRealRequireRole();
    expect(await requireRole(["ADMIN", "INVENTORY_MANAGER"])).toEqual({
      ok: false,
      status: 403,
      message: "Insufficient permissions.",
    });
  });

  it("returns the session when the role is allowed", async () => {
    const session = { user: { id: "u1", role: "INVENTORY_MANAGER" } };
    getServerSession.mockResolvedValue(session);
    const requireRole = await loadRealRequireRole();
    expect(await requireRole(["ADMIN", "INVENTORY_MANAGER"])).toEqual({ ok: true, session });
  });
});
