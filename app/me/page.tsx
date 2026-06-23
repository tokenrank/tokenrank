import { auth } from "@/src/auth/config";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Auth smoke test
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">My account</h1>
        </div>

        {user ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Signed in as</p>
                <p className="mt-1 text-xl font-semibold">{user.name ?? "X user"}</p>
              </div>

              <dl className="grid gap-3 text-sm">
                <div className="grid gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400">User ID</dt>
                  <dd className="font-mono text-zinc-800 dark:text-zinc-200">{user.id}</dd>
                </div>
                {user.email ? (
                  <div className="grid gap-1">
                    <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
                    <dd>{user.email}</dd>
                  </div>
                ) : null}
                {user.image ? (
                  <div className="grid gap-1">
                    <dt className="text-zinc-500 dark:text-zinc-400">Avatar URL</dt>
                    <dd className="break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {user.image}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <Link
                href="/api/auth/signout?callbackUrl=/me"
                prefetch={false}
                className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Sign out
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xl font-semibold">Signed out</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Connect an X account to verify the Auth.js route, session, and user sync.
                </p>
              </div>

              <Link
                href="/api/auth/signin/twitter?callbackUrl=/me"
                prefetch={false}
                className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Sign in with X
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
