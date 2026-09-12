import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-32 text-center">
      <h1 className="text-3xl font-semibold">PC Builder Platform</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        3D PC building simulation and component inventory management. Still early —
        this page will become the real workspace shell in a later milestone.
      </p>

      {session?.user ? (
        <div className="flex flex-col items-center gap-2">
          <p>
            Signed in as <strong>{session.user.email}</strong> ({session.user.role})
          </p>
          {(session.user.role === "ADMIN" || session.user.role === "INVENTORY_MANAGER") && (
            <Link href="/admin" className="underline">
              Go to admin
            </Link>
          )}
          <SignOutButton />
        </div>
      ) : (
        <div className="flex gap-4">
          <Link href="/login" className="rounded bg-foreground px-4 py-2 text-background">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded border border-zinc-300 px-4 py-2 dark:border-zinc-700"
          >
            Register
          </Link>
        </div>
      )}
    </div>
  );
}
