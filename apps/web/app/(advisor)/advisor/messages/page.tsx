import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { MessageGlyph } from "@/components/ui/glyphs";
import { ConversationList } from "./_components/conversation-list";

export const metadata = { title: "Mensajes" };

export default async function MessagesPage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return (
    <ThreeColumnLayout
      list={<ConversationList staffUserId={session.user.id} />}
      detail={
        <div className="flex h-full items-center justify-center">
          <AdvisorEmptyState
            icon={<MessageGlyph className="size-8" />}
            title="Selecciona una conversación"
            description="O busca a una clienta arriba para empezar una nueva."
          />
        </div>
      }
    />
  );
}
