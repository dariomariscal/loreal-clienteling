import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { ConversationList } from "../_components/conversation-list";
import { ConversationThread } from "./_components/conversation-thread";

export const metadata = { title: "Conversación" };

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  const { customerId } = await params;

  return (
    <ThreeColumnLayout
      list={
        <ConversationList
          activeCustomerId={customerId}
          staffUserId={session.user.id}
        />
      }
      detail={<ConversationThread customerId={customerId} />}
    />
  );
}
