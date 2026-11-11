import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-gold",
        className,
      )}
      {...props}
    />
  );
}
