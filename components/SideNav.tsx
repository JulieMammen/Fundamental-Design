"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "LOINC mapping" },
  { href: "/rxnorm", label: "RxNorm review" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-2 border-r border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 px-2 pt-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          T
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">TermMap</p>
          <p className="text-xs text-muted-foreground">Terminology review</p>
        </div>
      </div>
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
                  ? "justify-start bg-accent font-semibold text-accent-foreground hover:bg-accent"
                  : "justify-start text-muted-foreground"
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
