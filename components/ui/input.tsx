import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-ink shadow-sm outline-none transition focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal/20",
        className,
      )}
      {...props}
    />
  );
}
