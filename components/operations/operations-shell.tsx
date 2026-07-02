import type { ReactNode } from "react";
import { OperationsNav } from "./operations-nav";
import { OperationsPageHeader } from "./operations-page-header";

type OperationsShellProps = {
  children: ReactNode;
};

export function OperationsShell({ children }: OperationsShellProps) {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <OperationsPageHeader />
        <OperationsNav />
        <section className="rounded-2xl bg-slate-100 p-4 sm:p-5 lg:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
