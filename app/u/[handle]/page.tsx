import { notFound } from "next/navigation";

import { UsageDashboard } from "@/components/dashboard/usage-dashboard";
import { getProfile } from "@/src/lib/users";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getProfile(handle);

  if (!profile) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <UsageDashboard name={profile.user.name} handle={profile.user.handle} daily={profile.daily} />
    </main>
  );
}
