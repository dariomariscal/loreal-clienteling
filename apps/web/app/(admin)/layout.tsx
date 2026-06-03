import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { homeForRole } from "@/lib/auth/home-for-role";
import { isAdminRole } from "./_lib/role-guard";
import { SidebarProvider } from "@/components/admin/sidebar-context";
import { DashboardSidebar } from "@/components/admin/sidebar";
import { DashboardHeader } from "@/components/admin/header";
import { CreateMenuProvider } from "@/components/providers/create-menu-provider";
import { GlobalCreateSheets } from "@/components/admin/global-create-sheets";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  if (!session.user.active) redirect(ROUTES.SIGN_IN);
  if (!isAdminRole(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <CreateMenuProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          <DashboardSidebar user={session.user} />

          <div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
            <DashboardHeader />
            <main className="flex-1 overflow-y-auto overscroll-contain px-6 py-8 lg:px-10 lg:py-10">
              {children}
            </main>
          </div>
        </div>

        <GlobalCreateSheets />
      </SidebarProvider>
    </CreateMenuProvider>
  );
}
