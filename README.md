# PolicyAI

PolicyAI is an internal knowledge assistant. It answers questions from company documents with retrieval-augmented generation, and Auth0 Fine-Grained Authorization decides which chunks are allowed to reach the model.

A question follows this path:

1. Auth0 Universal Login, or a bearer access token, identifies the user. The subject is taken from the validated session or JWT.
2. The question is embedded with OpenAI `text-embedding-3-small` (1536 dimensions).
3. pgvector returns the nearest chunks. Department and classification filters narrow that search. They are not the authorization check.
4. Auth0 FGA `batchCheck` evaluates `can_view` for every candidate document. Denied and failed checks are removed.
5. Only the remaining excerpts are sent to the OpenAI chat API, with citations.

If FGA is unavailable, the request fails closed and the model is not called.

## Authorization model

The model in `fga/model.fga` has four types: `user`, `organization`, `department`, and `document`.

- Organization `admin` and `member` are direct user relations.
- Department `manager` and `member` are direct user relations.
- A document `owner` can view it.
- A department `manager` can view every document assigned to that department, including restricted salary and finance records.
- A department `member` can view a document only when the stored classification is `public` or `internal`.
- An organization `member` can view a document only when the stored classification is `public`.

The classification is stored on the relationship tuple when the document is authorized. Checks do not send a classification context, so a caller cannot relabel a restricted document as public at query time.

A general employee is a department member, not a manager. Restricted salary and finance documents stay out of that employee's results. A manager in one department does not inherit documents from another department.

## Local demo

Requirements: Docker, Node.js 20 or newer, and pnpm 10 or newer.

```bash
pnpm install
pnpm demo:up
cp .env.example .env.local
pnpm db:migrate
pnpm fga:bootstrap
pnpm test
```

`pnpm demo:up` starts Postgres with pgvector on port `54329` and OpenFGA on port `8080`. The OpenFGA playground is on port `3001`. OpenFGA stores its own data in the `openfga` database, so tuples survive a container restart. The first `pnpm fga:bootstrap` writes the store id and model id to `.fga/local.json`.

The automated tests are the reproducible authorization demo. They create a throwaway FGA store, load `fga/model.fga`, and assert:

| Case | Expected result |
| --- | --- |
| A. HR manager, salary document | Allowed |
| B. HR employee, salary document | Denied. The handbook remains allowed |
| C. Finance manager, financial report | Allowed |
| D. Other department, restricted document | Denied |
| E. Retrieval | Unauthorized text never enters the prompt, and a fully denied result does not call the model |
| F. Authentication | Missing, malformed, expired, and wrongly signed tokens are rejected |

`tests/retrieval-db.test.ts` also runs the cosine search against Postgres and then the same FGA filter.

## Sign in

Create an Auth0 Regular Web Application and an API whose identifier matches `AUTH0_AUDIENCE`.

Application URLs:

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

Put the tenant domain, client id, client secret, and a 64-character hex `AUTH0_SECRET` in `.env.local`. Generate the secret with `openssl rand -hex 32`.

Log in once and copy the subject shown in the sidebar. Set `POLICYAI_ADMIN_SUB` to that subject and run `pnpm fga:bootstrap` again. That grants the organization `admin` relation used by the permission screen. It does not grant department access.

With an OpenAI key in `.env.local`:

```bash
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Suggested walkthrough after seeding:

1. As an organization admin who is not an HR manager, the library shows the public code of conduct and withholds the salary and finance records.
2. On Permissions, grant your subject `department_member` on Human Resources. The handbook appears. The salary document does not.
3. Ask about parental leave. The answer can cite the handbook. Ask about salary bands. The restricted record is withheld and is not cited.
4. Grant `department_manager` on Human Resources. The salary document becomes visible, and a new question can cite it.
5. The finance report stays hidden until you grant Finance manager or an explicit document viewer.

Uploads accept PDF, TXT, and Markdown up to 8 MB. The bytes are hashed, parsed as text, chunked, and embedded. They are not executed and not written to disk. Restricted uploads require the department manager relation.

## Tiger Data Cloud

Use a Tiger Data (Timescale) service with the pgvector extension enabled, and set `DATABASE_URL` to its connection string. Enable the `vector` extension in the Tiger console before migrating if the role cannot create extensions itself. Then run `pnpm db:migrate`. The migration creates `vector(1536)` and an HNSW cosine index. Changing the embedding model requires a new migration because the column width is fixed to `text-embedding-3-small`.

## Auth0 FGA Cloud

Create a store in the Auth0 FGA dashboard and copy the client credentials into `.env.local`:

```bash
FGA_API_URL=https://api.us1.fga.dev
FGA_API_TOKEN_ISSUER=auth.fga.dev
FGA_API_AUDIENCE=https://api.us1.fga.dev/
FGA_CLIENT_ID=
FGA_CLIENT_SECRET=
```

`pnpm fga:bootstrap` writes the model and the sample directory with the official `@openfga/sdk`. You can paste `fga/model.fga` into the FGA playground instead of the bootstrap script; the application still has to receive the resulting store id and model id.

## Audit

Authorization events record the user subject, document id, result (`allowed`, `denied`, or `error`), retrieval request id, and timestamp. They do not record chunk text or document bodies. Permission changes store a short action code such as `grant:department_member:hr`.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm demo:up` | Start local Postgres and OpenFGA |
| `pnpm db:migrate` | Apply `drizzle/0000_init.sql` |
| `pnpm fga:bootstrap` | Create the FGA store, model, and directory tuples |
| `pnpm db:seed` | Embed and authorize the sample documents |
| `pnpm dev` | Start Next.js |
| `pnpm test` | Run the authorization, retrieval, and authentication tests |
| `pnpm demo:down` | Stop the local services |
