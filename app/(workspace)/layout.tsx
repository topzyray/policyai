import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { readSessionIdentity } from "@/lib/auth/identity";
import { upsertUserProfile } from "@/lib/users";

export const instant = false;

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const identity = await readSessionIdentity();
  if (!identity) redirect("/auth/login?returnTo=/documents");

  let warning: string | undefined;
  let user = identity;
  try {
    const profile = await upsertUserProfile(identity);
    user = {
      sub: profile.auth0Sub,
      email: profile.email ?? identity.email,
      name: profile.name ?? identity.name,
    };
  } catch {
    warning = "The user profile could not be saved. Authorization still uses the Auth0 subject from your session.";
  }

  return (
    <AppShell user={user} warning={warning}>
      {children}
    </AppShell>
  );
}
