// The one piece of state shared between a test file and the mocked
// `requireRole` (see setup.ts): who is "logged in" for the next request.
export type TestSessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN" | "INVENTORY_MANAGER";
};

let current: TestSessionUser | null = null;

export function setSession(user: TestSessionUser | null) {
  current = user;
}

export function getSession() {
  return current;
}
