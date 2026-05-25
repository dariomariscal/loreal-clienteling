import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { MessagesPage } from "./_components/messages-page";

export default async function MessagesRoute() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <MessagesPage user={session.user} />;
}
