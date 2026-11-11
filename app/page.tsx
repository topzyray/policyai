import Link from "next/link";
import { connection } from "next/server";
import { FileLock2, Quote, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { isAuth0Configured } from "@/lib/auth0";
import { readSessionIdentity } from "@/lib/auth/identity";
import { readLocalFgaStore } from "@/lib/fga/client";

export const instant = false;

const steps = [
  {
    title: "Identify",
    body: "Auth0 Universal Login or a validated access token supplies the subject. The client cannot choose who it is.",
  },
  {
    title: "Retrieve",
    body: "The question is embedded and matched against document chunks in Postgres with pgvector.",
  },
  {
    title: "Authorize",
    body: "Auth0 FGA checks can_view on every candidate. Denied text is removed before the model is called.",
  },
  {
    title: "Cite",
    body: "The answer is generated only from the remaining excerpts, and each citation stays on screen.",
  },
];

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
    { name: "PostgreSQL and pgvector", ready: Boolean(process.env.DATABASE_URL) },
    {
      name: "Auth0 FGA store",
      ready: Boolean((process.env.FGA_STORE_ID && process.env.FGA_MODEL_ID) || localFga.storeId),
    },
    { name: "OpenAI embeddings and chat", ready: Boolean(process.env.OPENAI_API_KEY) },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy/95 text-white backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-sm font-semibold tracking-tight">PolicyAI</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#product" className="hover:text-white">
              Product
            </a>
            <a href="#access" className="hover:text-white">
              Access control
            </a>
            <a href="#setup" className="hover:text-white">
              Setup
            </a>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignIn identity={identity} />
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden bg-navy text-white">
          <div className="hero-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-emerald-200 uppercase">Northline knowledge desk</p>
              <h1 className="mt-4 max-w-xl font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
                Answers that stop at the documents you can read.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                PolicyAI searches internal policy with retrieval-augmented generation. Auth0 FGA removes every unauthorized chunk before OpenAI sees the question.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <SignIn identity={identity} prominent />
                <a href="#access" className="inline-flex h-11 items-center rounded-lg px-4 text-sm text-slate-300 hover:text-white">
                  See the access model
                </a>
              </div>
            </div>
            <PreviewCard />
          </div>
        </section>

        <section id="product" className="mx-auto grid max-w-6xl gap-4 px-5 py-16 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Identity from Auth0",
              body: "Sessions and bearer tokens are verified. A user id in the request body is ignored.",
            },
            {
              icon: FileLock2,
              title: "Document-level FGA",
              body: "Managers see restricted records in their own department. Employees and other departments do not.",
            },
            {
              icon: Quote,
              title: "Cited answers",
              body: "Every response lists the authorized excerpts that were actually sent to the model.",
            },
          ].map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <feature.icon className="h-5 w-5 text-teal" aria-hidden="true" />
              <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
            </article>
          ))}
        </section>

        <section id="access" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">Authorization happens before the model</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              The model is not asked to respect permissions. FGA decides, and only the allowed text is included in the prompt.
            </p>
            <ol className="mt-8 grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-border bg-canvas p-4">
                  <span className="text-xs font-semibold text-teal">0{index + 1}</span>
                  <h3 className="mt-2 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="setup" className="mx-auto max-w-6xl px-5 py-16">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Environment</h2>
                <p className="mt-1 text-sm text-muted">Status of this deployment. Secrets are not shown.</p>
              </div>
              {params.auth === "unconfigured" ? (
                <p className="text-sm text-rose-700 dark:text-rose-300">Sign-in is unavailable until Auth0 is configured.</p>
              ) : null}
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {checks.map((check) => (
                <li key={check.name} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
                  <span>{check.name}</span>
                  <span className={check.ready ? "font-medium text-emerald-700 dark:text-emerald-300" : "font-medium text-rose-700 dark:text-rose-300"}>
                    {check.ready ? "Ready" : "Missing"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function SignIn({
  identity,
  prominent = false,
}: {
  identity: { name?: string; email?: string; sub: string } | null;
  prominent?: boolean;
}) {
  if (identity) {
    return (
      <Link
        href="/documents"
        className={
          prominent
            ? "inline-flex h-11 items-center rounded-lg bg-white px-4 text-sm font-medium text-navy"
            : "inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm font-medium text-navy"
        }
      >
        Open library
      </Link>
    );
  }

  if (!isAuth0Configured()) {
    if (!prominent) return <span className="text-xs text-slate-400">Auth0 not configured</span>;
    return (
      <a href="#setup" className="inline-flex h-11 items-center rounded-lg bg-white px-4 text-sm font-medium text-navy">
        Review setup
      </a>
    );
  }

  return (
    <a
      href="/auth/login?returnTo=/documents"
      className={
        prominent
          ? "inline-flex h-11 items-center rounded-lg bg-white px-4 text-sm font-medium text-navy"
          : "inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm font-medium text-navy"
      }
    >
      Continue with Auth0
    </a>
  );
}

function PreviewCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4 text-ink shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Preview</p>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800">
          FGA checked
        </span>
      </div>
      <p className="mt-4 text-sm font-medium">What is the parental leave policy?</p>
      <div className="mt-3 rounded-xl bg-surface px-4 py-3 text-sm leading-6 text-ink/80">
        Primary caregivers receive 16 weeks at full pay. The handbook is the cited source.
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3">
        <div>
          <p className="text-sm font-medium">Employee Handbook</p>
          <p className="text-xs text-muted">Human Resources · internal</p>
        </div>
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200 ring-inset dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800">
          Cited
        </span>
      </div>
      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
        One matching document was withheld. Its contents were not sent to the model.
      </p>
    </div>
  );
}
