import { cn } from "@/lib/utils";
import type { Classification } from "@/lib/directory";

const styles: Record<Classification, string> = {
  public: "bg-emerald-100 text-emerald-950",
  internal: "bg-sky-100 text-sky-950",
  restricted: "bg-amber-100 text-amber-950",
};

export function ClassificationBadge({ value }: { value: string }) {
  const style = styles[value as Classification] ?? "bg-stone-200 text-stone-800";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide", style)}>{value}</span>;
}
