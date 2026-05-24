import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { MessagesInboxScreen } from "./_components/messages-inbox-screen";

export const dynamic = "force-dynamic";

export default async function MessagesInboxPage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <MessagesInboxScreen user={session.user} />;
}
