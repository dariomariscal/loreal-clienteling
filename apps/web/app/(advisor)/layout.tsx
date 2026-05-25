import type { ReactNode } from "react";
import { AdvisorSidebar } from "@/components/advisor/advisor-sidebar";

export default function AdvisorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[color:var(--ba-surface)] text-foreground">
      <AdvisorSidebar />
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
