import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { CommandSearchProvider } from "./_components/command-search-provider";
import { BaSidebar } from "./_components/ba-sidebar";

// Master-detail shell inspired by Linear's March 2026 refresh:
//   - 280px dim warm-gray sidebar (steps aside so the customer wins)
//   - Main content sits on a near-white surface, no chrome
//   - Cmd+K palette is mounted globally via CommandSearchProvider
// Admin/manager/supervisor users never reach here — middleware redirects.
export default async function BaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  if (session.user.role !== "ba") redirect("/");
  if (!session.user.active) redirect(ROUTES.SIGN_IN);

  return (
    <CommandSearchProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--ba-surface)]">
        <BaSidebar user={session.user} />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </CommandSearchProvider>
  );
}
