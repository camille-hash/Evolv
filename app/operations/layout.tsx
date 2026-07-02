import type { ReactNode } from "react";
import { OperationsShell } from "@/components/operations/operations-shell";

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return <OperationsShell>{children}</OperationsShell>;
}
