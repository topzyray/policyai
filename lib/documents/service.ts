import { and, desc, eq, inArray } from "drizzle-orm";
import type { AuthIdentity } from "@/lib/auth/identity";
import { recordAudit } from "@/lib/audit";
import {
  DEPARTMENTS,
  ORGANIZATION_ID,
  ORGANIZATION_NAME,
  isClassification,
  isDepartmentId,
  type Classification,
} from "@/lib/directory";
import { getDb } from "@/lib/db";
import { departments, documentChunks, documents, organizations } from "@/lib/db/schema";
import { chunkText } from "@/lib/documents/chunk";
import { extractDocumentText } from "@/lib/documents/extract";
import { sha256, type UploadKind } from "@/lib/documents/validate";
import { createFgaAuthorizer } from "@/lib/fga/authorizer";
import { getFgaClient } from "@/lib/fga/client";
import { checkRelation, deleteTuples, documentRef, readAllTuples, syncDocumentAuthorization } from "@/lib/fga/tuples";
import { HttpError } from "@/lib/http";
import { embedTexts } from "@/lib/rag/embeddings";
import type { SearchFilters } from "@/lib/rag/search";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertUuid(value: string) {
  if (!UUID_PATTERN.test(value)) throw new HttpError(400, "invalid_document_id");
  return value;
}

export async function ensureCatalog() {
  const db = getDb();
  await db
    .insert(organizations)
    .values({ id: ORGANIZATION_ID, name: ORGANIZATION_NAME })
    .onConflictDoNothing();
  await db
    .insert(departments)
    .values(
      DEPARTMENTS.map((department) => ({
        id: department.id,
        organizationId: ORGANIZATION_ID,
        name: department.name,
      })),
    )
    .onConflictDoNothing();
}

export async function assertCanUpload(
  userSub: string,
  departmentId: string,
  classification: Classification,
) {
  if (!isDepartmentId(departmentId)) throw new HttpError(400, "unknown_department");
  const client = await getFgaClient();
  const [admin, manager, member] = await Promise.all([
    checkRelation(client, userSub, "admin", `organization:${ORGANIZATION_ID}`),
    checkRelation(client, userSub, "manager", `department:${departmentId}`),
    checkRelation(client, userSub, "member", `department:${departmentId}`),
  ]);

  const allowed = admin || (classification === "restricted" ? manager : manager || member);
  if (!allowed) {
    await recordAudit([
      {
        retrievalRequestId: null,
        userSub,
        documentId: null,
        action: "upload",
        result: "denied",
        detail: `upload:${departmentId}:${classification}`,
      },
    ]);
    throw new HttpError(403, "access_denied");
  }
}

export async function listDepartments() {
  await ensureCatalog();
  return getDb().select().from(departments).orderBy(departments.name);
}

export async function listVisibleDocuments(userSub: string, filters: SearchFilters) {
  const db = getDb();
  const conditions = [];
  if (filters.departmentId) conditions.push(eq(documents.departmentId, filters.departmentId));
  if (filters.classification && isClassification(filters.classification)) {
    conditions.push(eq(documents.classification, filters.classification));
  }

  const ids = await db
    .select({ id: documents.id })
    .from(documents)
    .where(conditions.length ? and(...conditions) : undefined);

  const authorizer = createFgaAuthorizer(await getFgaClient());
  const decisions = await authorizer.canViewDocuments(
    userSub,
    ids.map((row) => row.id),
  );
  const allowedIds = ids.filter((row) => decisions.get(row.id)?.allowed).map((row) => row.id);
  const hiddenCount = ids.length - allowedIds.length;
  if (allowedIds.length === 0) return { documents: [], hiddenCount };

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      originalFilename: documents.originalFilename,
      departmentId: documents.departmentId,
      classification: documents.classification,
      ownerSub: documents.ownerSub,
      uploadedBySub: documents.uploadedBySub,
      contentHash: documents.contentHash,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(inArray(documents.id, allowedIds))
    .orderBy(desc(documents.createdAt));

  return { documents: rows, hiddenCount };
}

export async function readAuthorizedDocument(userSub: string, documentId: string) {
  assertUuid(documentId);
  const db = getDb();
  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!existing) throw new HttpError(404, "document_not_found");

  const allowed = await checkRelation(await getFgaClient(), userSub, "can_view", documentRef(documentId));
  await recordAudit([
    {
      retrievalRequestId: null,
      userSub,
      documentId,
      action: "document_read",
      result: allowed ? "allowed" : "denied",
    },
  ]);

  if (!allowed) throw new HttpError(403, "access_denied");

  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!document) throw new HttpError(404, "document_not_found");
  return document;
}

export async function ingestUpload(input: {
  identity: AuthIdentity;
  title: string;
  departmentId: string;
  classification: Classification;
  filename: string;
  kind: UploadKind;
  bytes: Uint8Array;
}) {
  const title = input.title.trim().slice(0, 180);
  if (!title) throw new HttpError(400, "title_required");
  await ensureCatalog();
  await assertCanUpload(input.identity.sub, input.departmentId, input.classification);

  const bodyText = await extractDocumentText(input.kind, input.bytes);
  const parts = chunkText(bodyText);
  if (parts.length === 0) throw new HttpError(400, "no_extractable_text");
  const embeddings = await embedTexts(parts);
  const id = crypto.randomUUID();
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.insert(documents).values({
      id,
      title,
      originalFilename: input.filename,
      departmentId: input.departmentId,
      classification: input.classification,
      ownerSub: input.identity.sub,
      uploadedBySub: input.identity.sub,
      contentHash: sha256(input.bytes),
      bodyText,
    });
    await tx.insert(documentChunks).values(
      parts.map((content, chunkIndex) => ({
        id: crypto.randomUUID(),
        documentId: id,
        chunkIndex,
        content,
        departmentId: input.departmentId,
        classification: input.classification,
        documentTitle: title,
        embedding: embeddings[chunkIndex]!,
      })),
    );
  });

  try {
    await syncDocumentAuthorization(await getFgaClient(), {
      id,
      ownerSub: input.identity.sub,
      departmentId: input.departmentId,
      classification: input.classification,
    });
  } catch (error) {
    await db.delete(documents).where(eq(documents.id, id));
    throw error;
  }

  await recordAudit([
    {
      retrievalRequestId: null,
      userSub: input.identity.sub,
      documentId: id,
      action: "upload",
      result: "allowed",
      detail: `upload:${input.departmentId}:${input.classification}`,
    },
  ]);

  return { id, chunks: parts.length };
}

export async function deleteDocument(userSub: string, documentId: string) {
  assertUuid(documentId);
  const client = await getFgaClient();
  const [owner, editor, admin] = await Promise.all([
    checkRelation(client, userSub, "owner", documentRef(documentId)),
    checkRelation(client, userSub, "editor", documentRef(documentId)),
    checkRelation(client, userSub, "admin", `organization:${ORGANIZATION_ID}`),
  ]);
  if (!owner && !editor && !admin) throw new HttpError(403, "access_denied");

  const tuples = await readAllTuples(client, { object: documentRef(documentId) });
  await getDb().delete(documents).where(eq(documents.id, documentId));
  await deleteTuples(
    client,
    tuples.map((tuple) => ({
      user: tuple.key.user,
      relation: tuple.key.relation,
      object: tuple.key.object,
    })),
  );
}
