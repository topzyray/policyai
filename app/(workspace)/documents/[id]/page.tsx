import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { AccessDenied } from "@/components/access-denied";
import { ClassificationBadge } from "@/components/classification-badge";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { PageHeader } from "@/components/page-header";
import { readSessionIdentity } from "@/lib/auth/identity";
import { departmentName } from "@/lib/directory";
import { readAuthorizedDocument } from "@/lib/documents/service";
import { HttpError } from "@/lib/http";
import { formatTimestamp } from "@/lib/utils";

export const instant = false;

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const identity = await readSessionIdentity();
  if (!identity) redirect("/auth/login");
  const { id } = await params;

  const loaded = await loadDocument(identity.sub, id);
  if (loaded.status === "missing") notFound();
  if (loaded.status === "denied") {
    return (
      <AccessDenied description="Auth0 FGA did not grant can_view on this document. The title and body were not loaded into the page." />
    );
  }
  if (loaded.status === "unavailable") {
    return <AccessDenied title="Document unavailable" description="The document could not be loaded." />;
  }

  const document = loaded.document;
  return (
    <article className="space-y-6">
      <PageHeader
        eyebrow={departmentName(document.departmentId)}
        title={document.title}
        description={`${document.originalFilename} · ${formatTimestamp(document.createdAt)}`}
        action={<DeleteDocumentButton documentId={document.id} />}
      />
      <div className="flex flex-wrap items-center gap-3">
        <ClassificationBadge value={document.classification} />
        <p className="truncate font-mono text-xs text-muted">sha256 {document.contentHash}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card px-6 py-6 text-sm leading-7 whitespace-pre-wrap shadow-sm">
        {document.bodyText}
      </div>
    </article>
  );
}

async function loadDocument(userSub: string, id: string) {
  try {
    return { status: "ok" as const, document: await readAuthorizedDocument(userSub, id) };
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return { status: "missing" as const };
    if (error instanceof HttpError && error.status === 403) return { status: "denied" as const };
    return { status: "unavailable" as const };
  }
}
