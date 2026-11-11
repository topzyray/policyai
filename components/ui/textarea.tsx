import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-gold",
        className,
      )}
      {...props}
    />
  );
}
