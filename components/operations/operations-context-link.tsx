import Link from "next/link";
import type { ReactNode } from "react";

type OperationsContextLinkProps = {
  children: ReactNode;
  href: string;
};

export function OperationsContextLink({
  children,
  href,
}: OperationsContextLinkProps) {
  return (
    <Link
      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
      href={href}
    >
      {children}
    </Link>
  );
}
