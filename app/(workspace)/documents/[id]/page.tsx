import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { AccessDenied } from "@/components/access-denied";
import { ClassificationBadge } from "@/components/classification-badge";
import { DeleteDocumentButton } from "@/components/delete-document-button";
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">{departmentName(document.departmentId)}</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">{document.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
            <ClassificationBadge value={document.classification} />
            <span>{document.originalFilename}</span>
            <span>{formatTimestamp(document.createdAt)}</span>
          </div>
          <p className="mt-2 font-mono text-xs text-muted">sha256 {document.contentHash}</p>
        </div>
        <DeleteDocumentButton documentId={document.id} />
      </header>
      <div className="rounded-lg border border-border bg-card px-6 py-6 text-sm leading-7 whitespace-pre-wrap">
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
