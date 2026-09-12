import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-32 text-center">
      <h1 className="text-3xl font-semibold">PC Builder Platform</h1>
      <p className="max-w-md text-zinc-400">
        3D PC building simulation and component inventory management. Still early —
        browsing real components and the 3D build engine land in later phases.
      </p>

      <Link
        href="/workspace"
        className="rounded bg-zinc-100 px-4 py-2 font-medium text-zinc-950"
      >
        {session?.user ? "Enter workspace" : "Preview workspace"}
      </Link>
    </div>
  );
}
