import type { ReactNode } from "react";
import { OperationsNav } from "./operations-nav";
import { OperationsPageHeader } from "./operations-page-header";

type OperationsShellProps = {
  children: ReactNode;
};

export function OperationsShell({ children }: OperationsShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <OperationsPageHeader />
        <OperationsNav />
        <section className="rounded-md border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
