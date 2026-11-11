import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { EMBEDDING_DIMENSIONS } from "@/lib/directory";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const departments = pgTable("departments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  auth0Sub: text("auth0_sub").notNull().unique(),
  email: text("email"),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey(),
    title: text("title").notNull(),
    originalFilename: text("original_filename").notNull(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id),
    classification: text("classification").notNull(),
    ownerSub: text("owner_sub").notNull(),
    uploadedBySub: text("uploaded_by_sub").notNull(),
    contentHash: text("content_hash").notNull(),
    bodyText: text("body_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "documents_classification_check",
      sql`${table.classification} in ('public', 'internal', 'restricted')`,
    ),
    index("documents_department_idx").on(table.departmentId, table.classification),
  ],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    departmentId: text("department_id").notNull(),
    classification: text("classification").notNull(),
    documentTitle: text("document_title").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  },
  (table) => [
    uniqueIndex("document_chunks_document_idx").on(table.documentId, table.chunkIndex),
    index("document_chunks_metadata_idx").on(table.departmentId, table.classification),
    index("document_chunks_embedding_hnsw").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    retrievalRequestId: uuid("retrieval_request_id"),
    userSub: text("user_sub").notNull(),
    documentId: uuid("document_id"),
    action: text("action").notNull(),
    result: text("result").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    check("audit_events_result_check", sql`${table.result} in ('allowed', 'denied', 'error')`),
    index("audit_events_created_idx").on(table.createdAt),
  ],
);
