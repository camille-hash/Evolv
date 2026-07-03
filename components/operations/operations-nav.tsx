"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const operationsNavItems = [
  { href: "/operations", label: "Overview" },
  { href: "/operations/contracts", label: "Contratos" },
  { href: "/operations/clients", label: "Clientes" },
  { href: "/operations/administrators", label: "Administradoras" },
  { href: "/operations/revenue", label: "Revenue" },
  { href: "/operations/portfolio", label: "Portfolio" },
  { href: "/operations/attention", label: "Attention" },
];

export function OperationsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto rounded-md border bg-card p-2 shadow-sm">
      {operationsNavItems.map((item) => {
        const isActive =
          item.href === "/operations"
            ? pathname === item.href
            : pathname?.startsWith(item.href);

        return (
          <Link
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
