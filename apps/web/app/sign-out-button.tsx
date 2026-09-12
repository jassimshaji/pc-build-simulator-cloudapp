"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button onClick={() => signOut()} className="text-sm underline">
      Sign out
    </button>
  );
}
