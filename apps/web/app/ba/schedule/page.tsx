import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { ScheduleScreen } from "./_components/schedule-screen";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <ScheduleScreen user={session.user} />;
}
