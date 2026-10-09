"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "LOINC mapping" },
  { href: "/rxnorm", label: "RxNorm lookup" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-2 border-r border-slate-700 bg-slate-900 p-4">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        TermMap
      </p>
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              className={
                active
                  ? "justify-start bg-slate-700 text-white hover:bg-slate-700"
                  : "justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
              }
            >
              <Link href={link.href} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
