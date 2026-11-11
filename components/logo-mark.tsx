import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-sm font-semibold text-white shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      P
    </span>
  );
}
