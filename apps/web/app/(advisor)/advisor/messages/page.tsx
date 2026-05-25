import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { ConversationList } from "./_components/conversation-list";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { MessageGlyph } from "@/components/ui/glyphs";

export const metadata = { title: "Mensajes" };

export default function MessagesPage() {
  return (
    <ThreeColumnLayout
      list={<ConversationList />}
      detail={
        <div className="flex h-full items-center justify-center">
          <AdvisorEmptyState
            icon={<MessageGlyph className="size-8" />}
            title="Selecciona una conversación"
          />
        </div>
      }
    />
  );
}
