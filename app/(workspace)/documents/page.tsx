import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/access-denied";
import { ClassificationBadge } from "@/components/classification-badge";
import { PageHeader } from "@/components/page-header";
import { UploadForm } from "@/components/upload-form";
import { readSessionIdentity } from "@/lib/auth/identity";
import { DEPARTMENTS, departmentName } from "@/lib/directory";
import { listVisibleDocuments } from "@/lib/documents/service";
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
    loadError = libraryErrorMessage(error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library"
        title="Documents you can view"
        description="Titles appear only after Auth0 FGA grants can_view. Restricted records from other departments stay hidden."
      />
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
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface text-xs tracking-wide text-muted uppercase">
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
                    <td colSpan={5} className="px-4 py-12 text-center text-muted">
                      No visible documents. Upload one you are allowed to publish, or ask an admin for access.
                    </td>
                  </tr>
                ) : (
                  rows.map((document) => (
                    <tr key={document.id} className="border-t border-border hover:bg-surface/80">
                      <td className="px-4 py-3">
                        <Link href={`/documents/${document.id}`} className="font-medium text-ink hover:text-teal">
                          {document.title}
                        </Link>
                        <p className="text-xs text-muted">{document.originalFilename}</p>
                      </td>
                      <td className="px-4 py-3">{departmentName(document.departmentId)}</td>
                      <td className="px-4 py-3">
                        <ClassificationBadge value={document.classification} />
                      </td>
                      <td className="max-w-40 truncate px-4 py-3 font-mono text-xs text-muted">{document.ownerSub}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{formatTimestamp(document.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Upload</h2>
          <p className="mt-1 mb-4 text-sm leading-6 text-muted">
            Managers can publish restricted files. Members can publish internal and public files for their department.
          </p>
          <UploadForm />
        </section>
      </div>
    </div>
  );
}

function libraryErrorMessage(error: unknown) {
  if (error instanceof Error && "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause) {
    const code = String(error.cause.code);
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
      return "The document database is not reachable.";
    }
  }
  return "The library could not be loaded.";
}

function Filter({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 capitalize shadow-sm ${current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-ink hover:bg-surface"}`}
    >
      {children}
    </Link>
  );
}
