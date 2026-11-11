import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal/20",
        className,
      )}
      {...props}
    />
  );
}
