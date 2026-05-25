import {
  EmailDotGlyph,
  MessageGlyph,
  SmsDotGlyph,
  WhatsappDotGlyph,
} from "@/components/ui/glyphs";

type Channel = "whatsapp" | "sms" | "email" | string;

export function MessageChannelIcon({
  channel,
  className,
}: {
  channel: Channel;
  className?: string;
}) {
  switch (channel) {
    case "whatsapp":
      return <WhatsappDotGlyph className={className} />;
    case "sms":
      return <SmsDotGlyph className={className} />;
    case "email":
      return <EmailDotGlyph className={className} />;
    default:
      return <MessageGlyph className={className} />;
  }
}
