"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack, MessagesSquare, Shield } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { initials } from "@/lib/utils";

const links = [
  { href: "/documents", label: "Library", icon: FileStack },
  { href: "/chat", label: "Ask", icon: MessagesSquare },
  { href: "/admin", label: "Permissions", icon: Shield },
];

export function AppShell({
  user,
  warning,
  children,
}: {
  user: { sub: string; name?: string; email?: string };
  warning?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const displayName = user.name || user.email || "Signed in";

  return (
    <div className="min-h-screen bg-canvas text-ink md:grid md:grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-b border-white/10 bg-navy text-white md:sticky md:top-0 md:h-screen md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/documents" className="flex items-center gap-2.5">
            <LogoMark />
            <span>
              <span className="block text-sm font-semibold leading-none">PolicyAI</span>
              <span className="mt-1 block text-[11px] text-slate-400">Northline</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <a href="/auth/logout" className="text-xs text-slate-300 md:hidden">
              Sign out
            </a>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-3">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 p-4 md:block">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
              {initials(user.name, user.email ?? user.sub)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm">{displayName}</p>
              <p className="truncate font-mono text-[11px] text-slate-400" title={user.sub}>
                {user.sub}
              </p>
            </div>
          </div>
          <a href="/auth/logout" className="mt-3 inline-flex text-xs text-slate-300 hover:text-white">
            Sign out
          </a>
        </div>
      </aside>
      <div className="min-w-0">
        {warning ? (
          <p className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">{warning}</p>
        ) : null}
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8">{children}</div>
      </div>
    </div>
  );
}
