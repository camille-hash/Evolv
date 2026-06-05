import { Sidebar } from "@/components/layout/sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <Sidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
