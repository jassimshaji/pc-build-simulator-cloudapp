import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/app/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Nav() {
  const session = await getServerSession(authOptions);
  const canAccessAdmin =
    session?.user.role === "ADMIN" || session?.user.role === "INVENTORY_MANAGER";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 text-zinc-100">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight">
          PC Builder
        </Link>
        <Link href="/workspace" className="text-sm text-zinc-400 hover:text-zinc-100">
          Workspace
        </Link>
        {session?.user && (
          <Link href="/builds" className="text-sm text-zinc-400 hover:text-zinc-100">
            My builds
          </Link>
        )}
        {canAccessAdmin && (
          <Link href="/admin" className="text-sm text-zinc-400 hover:text-zinc-100">
            Admin
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm">
        <ThemeToggle />
        {session?.user ? (
          <>
            <span className="hidden text-zinc-400 sm:inline">
              {session.user.email}{" "}
              <span className="text-zinc-600">({session.user.role})</span>
            </span>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="text-zinc-400 hover:text-zinc-100">
              Log in
            </Link>
            <Link href="/register" className="rounded bg-zinc-100 px-3 py-1.5 text-zinc-950">
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
