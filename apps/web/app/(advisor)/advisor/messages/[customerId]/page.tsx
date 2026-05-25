import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { ConversationList } from "../_components/conversation-list";
import { ConversationThread } from "./_components/conversation-thread";

export const metadata = { title: "Conversation" };

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  return (
    <ThreeColumnLayout
      list={<ConversationList activeCustomerId={customerId} />}
      detail={<ConversationThread customerId={customerId} />}
    />
  );
}
