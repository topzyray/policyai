import { cn } from "@/lib/utils";
import type { Classification } from "@/lib/directory";

const styles: Record<Classification, string> = {
  public: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
  internal: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800",
  restricted: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
};

export function ClassificationBadge({ value }: { value: string }) {
  const style = styles[value as Classification] ?? "bg-surface text-ink ring-border";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset", style)}>
      {value}
    </span>
  );
}
