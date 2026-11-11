import { ShieldX } from "lucide-react";

export function AccessDenied({
  title = "Access denied",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 dark:border-amber-900/60 dark:bg-amber-950/40">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-white p-2 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800">
          <ShieldX className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-950/80 dark:text-amber-100/80">{description}</p>
        </div>
      </div>
    </section>
  );
}
