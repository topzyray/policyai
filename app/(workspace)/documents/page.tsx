import Link from "next/link";
import { connection } from "next/server";
import { AccessDenied } from "@/components/access-denied";
import { ClassificationBadge } from "@/components/classification-badge";
import { UploadForm } from "@/components/upload-form";
import { readSessionIdentity } from "@/lib/auth/identity";
import { DEPARTMENTS, departmentName } from "@/lib/directory";
import { listVisibleDocuments } from "@/lib/documents/service";
import { redirect } from "next/navigation";
import { formatTimestamp } from "@/lib/utils";
import { parseSearchFilters } from "@/lib/rag/search";

export const metadata = { title: "Library" };
export const instant = false;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; classification?: string }>;
}) {
  await connection();
  const identity = await readSessionIdentity();
  if (!identity) redirect("/auth/login?returnTo=/documents");
  const params = await searchParams;

  let hiddenCount = 0;
  let rows: Awaited<ReturnType<typeof listVisibleDocuments>>["documents"] = [];
  let loadError: string | null = null;
  try {
    const filters = parseSearchFilters({
      departmentId: params.department,
      classification: params.classification,
    });
    const result = await listVisibleDocuments(identity.sub, filters);
    rows = result.documents;
    hiddenCount = result.hiddenCount;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "The library could not be loaded.";
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Library</p>
          <h1 className="font-serif text-4xl tracking-tight">Documents you can view</h1>
        </div>
      </header>
      <div className="flex flex-wrap gap-2 text-sm">
        <Filter href="/documents" current={!params.department && !params.classification}>
          All
        </Filter>
        {DEPARTMENTS.map((department) => (
          <Filter key={department.id} href={`/documents?department=${department.id}`} current={params.department === department.id}>
            {department.name}
          </Filter>
        ))}
        {["public", "internal", "restricted"].map((classification) => (
          <Filter
            key={classification}
            href={`/documents?classification=${classification}${params.department ? `&department=${params.department}` : ""}`}
            current={params.classification === classification}
          >
            {classification}
          </Filter>
        ))}
      </div>
      {loadError ? <AccessDenied title="Library unavailable" description={loadError} /> : null}
      {hiddenCount > 0 ? (
        <AccessDenied
          title="Some documents are withheld"
          description={`${hiddenCount} document${hiddenCount === 1 ? " is" : "s are"} in this filter and Auth0 FGA denied can_view. Titles and text from those documents are not shown.`}
        />
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f7f1e4] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Classification</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-muted">
                  No visible documents. Upload one you are allowed to publish, or ask an admin to grant access.
                </td>
              </tr>
            ) : (
              rows.map((document) => (
                <tr key={document.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link href={`/documents/${document.id}`} className="font-medium hover:underline">
                      {document.title}
                    </Link>
                    <p className="text-xs text-muted">{document.originalFilename}</p>
                  </td>
                  <td className="px-4 py-3">{departmentName(document.departmentId)}</td>
                  <td className="px-4 py-3">
                    <ClassificationBadge value={document.classification} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{document.ownerSub}</td>
                  <td className="px-4 py-3 text-muted">{formatTimestamp(document.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-serif text-2xl">Upload</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Restricted files can be uploaded by a department manager. Internal and public files can be uploaded by a department member.</p>
        <UploadForm />
      </section>
    </div>
  );
}

function Filter({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${current ? "border-navy bg-navy text-primary-foreground" : "border-border bg-card"}`}
    >
      {children}
    </Link>
  );
}
