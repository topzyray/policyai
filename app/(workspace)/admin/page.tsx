import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/access-denied";
import { PermissionManager } from "@/components/permission-manager";
import { readSessionIdentity } from "@/lib/auth/identity";
import { listRecentAudit } from "@/lib/audit";
import { HttpError } from "@/lib/http";
import { assertOrganizationAdmin, listManagedTuples } from "@/lib/permissions";
import { formatTimestamp } from "@/lib/utils";

export const metadata = { title: "Permissions" };
export const instant = false;

export default async function AdminPage() {
  await connection();
  const identity = await readSessionIdentity();
  if (!identity) redirect("/auth/login?returnTo=/admin");

  let admin = true;
  let adminMessage = "Your Auth0 subject does not have the admin relation on the Northline organization. A department manager still cannot open this screen.";
  try {
    await assertOrganizationAdmin(identity.sub);
  } catch (error) {
    admin = false;
    if (error instanceof HttpError && error.message === "fga_not_configured") {
      adminMessage = "Auth0 FGA is not configured yet. Bootstrap the store, then grant your Auth0 subject the organization admin relation.";
    }
  }

  if (!admin) {
    return <AccessDenied title="Permission management is restricted" description={adminMessage} />;
  }

  const [tuples, events] = await Promise.all([listManagedTuples(), listRecentAudit()]);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Permissions</p>
        <h1 className="font-serif text-4xl tracking-tight">Authorization directory</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Grants are written to Auth0 FGA. Retrieval checks those tuples. Changing a grant here does not put document text into the audit log.
        </p>
      </header>
      <PermissionManager tuples={tuples} />
      <section>
        <h2 className="mb-3 font-serif text-2xl">Audit</h2>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7f1e4] text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Request</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-muted">
                    No authorization events yet.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-t border-border">
                    <td className="px-4 py-3 text-muted">{formatTimestamp(event.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{event.userSub}</td>
                    <td className="px-4 py-3">{event.action}</td>
                    <td className="px-4 py-3">{event.result}</td>
                    <td className="px-4 py-3 font-mono text-xs">{event.documentId ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{event.retrievalRequestId ?? event.detail ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
