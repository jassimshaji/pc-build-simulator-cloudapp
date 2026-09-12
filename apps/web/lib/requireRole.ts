import { getServerSession, type Session } from "next-auth";
import type { Role } from "@pcbuilder/database";
import { authOptions } from "@/lib/auth";

type RequireRoleResult =
  | { ok: true; session: Session }
  | { ok: false; status: 401 | 403; message: string };

// Server-side role gate for API route handlers and server components. Never
// trust a client-supplied role — this always re-reads the session's JWT.
export async function requireRole(allowedRoles: Role[]): Promise<RequireRoleResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { ok: false, status: 401, message: "Not authenticated." };
  }

  if (!allowedRoles.includes(session.user.role)) {
    return { ok: false, status: 403, message: "Insufficient permissions." };
  }

  return { ok: true, session };
}
