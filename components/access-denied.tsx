import { ShieldX } from "lucide-react";

export function AccessDenied({
  title = "Access denied",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <section className="rounded-lg border border-amber-200 bg-[#fff8ee] px-6 py-8">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-amber-100 p-2 text-amber-900">
          <ShieldX className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-serif text-2xl text-ink">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
    </section>
  );
}
