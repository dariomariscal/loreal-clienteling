import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { ADVISOR_HOME } from "@/lib/auth/home-for-role";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { CreateMenuProvider } from "@/components/providers/create-menu-provider";
import { GlobalCreateSheets } from "@/components/dashboard/global-create-sheets";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect(ROUTES.SIGN_IN);
  }

  if (!session.user.active) {
    redirect(ROUTES.SIGN_IN);
  }

  // Beauty Advisors live in the iPad-first /advisor shell — bounce them
  // out of the desktop dashboard so they never land in the wrong surface.
  if (session.user.role === "beauty_advisor") {
    redirect(ADVISOR_HOME);
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

        <GlobalCreateSheets userId={session.user.id} />
      </SidebarProvider>
    </CreateMenuProvider>
  );
}
