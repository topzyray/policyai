CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations (id),
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  auth0_sub text NOT NULL UNIQUE,
  email text,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  original_filename text NOT NULL,
  department_id text NOT NULL REFERENCES departments (id),
  classification text NOT NULL CHECK (classification IN ('public', 'internal', 'restricted')),
  owner_sub text NOT NULL,
  uploaded_by_sub text NOT NULL,
  content_hash text NOT NULL,
  body_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_department_idx
  ON documents (department_id, classification);

CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  department_id text NOT NULL,
  classification text NOT NULL,
  document_title text NOT NULL,
  embedding vector(1536) NOT NULL,
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS document_chunks_metadata_idx
  ON document_chunks (department_id, classification);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw
  ON document_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  retrieval_request_id uuid,
  user_sub text NOT NULL,
  document_id uuid,
  action text NOT NULL,
  result text NOT NULL CHECK (result IN ('allowed', 'denied', 'error')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_created_idx
  ON audit_events (created_at DESC);
