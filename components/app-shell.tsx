"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack, MessagesSquare, Shield } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[248px_1fr]">
      <aside className="relative border-b border-white/10 bg-navy text-primary-foreground md:min-h-screen md:border-b-0">
        <div className="flex items-center justify-between gap-4 px-5 py-5 md:block md:pb-28">
          <Link href="/documents" className="block">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#d7c4a1]">PolicyAI</p>
            <p className="font-serif text-2xl leading-none">Northline</p>
          </Link>
          <nav className="flex gap-1 md:mt-8 md:flex-col">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-white/10" : "hover:bg-white/5"}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="hidden border-t border-white/10 px-5 py-4 md:block md:absolute md:bottom-0 md:w-[248px]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d7c4a1] text-xs font-semibold text-navy">
              {initials(user.name, user.email ?? user.sub)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm">{user.name || user.email || "Signed in"}</p>
              <p className="truncate text-[11px] text-[#d7c4a1]" title={user.sub}>
                {user.sub}
              </p>
            </div>
          </div>
          <a href="/auth/logout" className="mt-3 inline-block text-xs text-[#d7c4a1] underline-offset-2 hover:underline">
            Sign out
          </a>
        </div>
      </aside>
      <div className="min-w-0">
        {warning ? (
          <p className="border-b border-amber-200 bg-[#fff8ee] px-6 py-3 text-sm text-amber-950">{warning}</p>
        ) : null}
        <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">{children}</div>
      </div>
    </div>
  );
}
