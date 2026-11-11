import Link from "next/link";
import { connection } from "next/server";
import { isAuth0Configured } from "@/lib/auth0";
import { readSessionIdentity } from "@/lib/auth/identity";
import { readLocalFgaStore } from "@/lib/fga/client";

export const instant = false;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const identity = await readSessionIdentity();
  const localFga = await readLocalFgaStore();
  const checks = [
    { name: "Auth0 Universal Login", ready: isAuth0Configured() },
    { name: "PostgreSQL with pgvector", ready: Boolean(process.env.DATABASE_URL) },
    { name: "Auth0 FGA store", ready: Boolean((process.env.FGA_STORE_ID && process.env.FGA_MODEL_ID) || localFga.storeId) },
    { name: "OpenAI embeddings and chat", ready: Boolean(process.env.OPENAI_API_KEY) },
  ];

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr]">
        <section>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Northline knowledge desk</p>
          <h1 className="mt-4 max-w-xl font-serif text-6xl leading-[0.95] tracking-tight">
            Policy answers that stop at the documents you are allowed to read.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted">
            PolicyAI retrieves company documents with pgvector, then asks Auth0 FGA whether you can view each one before any text is sent to the model.
          </p>
          <ol className="mt-8 space-y-3 text-sm leading-6">
            {[
              "Sign in with Auth0. The subject comes from the validated session or access token.",
              "Search chunk embeddings in Tiger Data or local Postgres.",
              "Batch-check can_view in Auth0 FGA and drop every denial.",
              "Answer from the remaining excerpts and cite them.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="font-serif text-xl text-gold">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
        <aside className="rounded-lg border border-border bg-card p-6 shadow-[0_20px_50px_rgba(23,32,51,0.06)]">
          {identity ? (
            <div>
              <p className="text-sm text-muted">Signed in as</p>
              <p className="mt-1 font-serif text-3xl">{identity.name || identity.email || "Northline user"}</p>
              <p className="mt-2 break-all font-mono text-xs text-muted">{identity.sub}</p>
              <Link href="/documents" className="mt-6 inline-flex h-11 items-center rounded-md bg-navy px-4 text-sm text-primary-foreground">
                Open the library
              </Link>
            </div>
          ) : (
            <div>
              <h2 className="font-serif text-3xl">Sign in</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Universal Login identifies you. Document access is decided afterward by FGA, not by the model.
              </p>
              {isAuth0Configured() ? (
                <a href="/auth/login?returnTo=/documents" className="mt-6 inline-flex h-11 items-center rounded-md bg-navy px-4 text-sm text-primary-foreground">
                  Continue with Auth0
                </a>
              ) : (
                <p className="mt-6 text-sm text-[#7f1d1d]">Auth0 environment variables are not set.</p>
              )}
            </div>
          )}
          {params.auth === "unconfigured" ? (
            <p className="mt-4 text-sm text-[#7f1d1d]">Sign-in is unavailable until Auth0 is configured.</p>
          ) : null}
          <ul className="mt-8 space-y-2 border-t border-border pt-4 text-sm">
            {checks.map((check) => (
              <li key={check.name} className="flex items-center justify-between gap-3">
                <span>{check.name}</span>
                <span className={check.ready ? "text-emerald-800" : "text-[#7f1d1d]"}>{check.ready ? "Ready" : "Missing"}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
