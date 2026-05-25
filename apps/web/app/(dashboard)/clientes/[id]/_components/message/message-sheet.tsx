"use client";

import * as React from "react";
import {
  useCustomerMessages,
  useCreateMessage,
  useCustomerConsents,
  useTemplates,
  type Message,
  type MessageTemplate,
  type Product,
} from "@/lib/hooks";
import type { CampaignType } from "@loreal/contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  CHANNELS,
  CAMPAIGN_TYPES,
  composerPlaceholder,
  type ChannelValue,
} from "./constants";
import { PaperclipIcon, SendIcon } from "./icons";
import { ChannelTabs } from "./channel-tabs";
import { MessageThread } from "./message-thread";
import { TemplatePicker } from "./template-picker";
import { AttachmentList } from "./attachment-list";
import { AttachmentPicker } from "./attachment-picker";

// Conversation sheet — iMessage-style thread.
// Top: channel tabs (WhatsApp / SMS / Email) with consent indicators.
// Middle: scrollable bubbles grouped by day.
// Bottom: composer with template chips, subject (email only), body.

interface MessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export function MessageSheet({
  open,
  onOpenChange,
  customerId,
  customerName,
}: MessageSheetProps) {
  const [channel, setChannel] = React.useState<ChannelValue>("whatsapp");
  const [body, setBody] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [campaignType, setCampaignType] = React.useState<CampaignType>("custom");
  const [attachments, setAttachments] = React.useState<Product[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const { data: messages = [], isLoading: messagesLoading } =
    useCustomerMessages(customerId);
  const { data: consents = [] } = useCustomerConsents(customerId);
  const { data: templates = [] } = useTemplates();
  const createMessage = useCreateMessage();

  React.useEffect(() => {
    if (open) {
      setBody("");
      setSubject("");
      setCampaignType("custom");
      setAttachments([]);
      setPickerOpen(false);
      createMessage.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleAttachment(product: Product) {
    setAttachments((prev) => {
      if (prev.some((p) => p.id === product.id)) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  }

  const activeConsents = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of consents) {
      if (!c.revokedAt) set.add(c.type);
    }
    return set;
  }, [consents]);

  const channelMeta = CHANNELS.find((c) => c.value === channel)!;
  const hasConsent = activeConsents.has(channelMeta.consentType);

  // Templates for the current channel, sorted so the active campaign type
  // is one tap away.
  const channelTemplates = React.useMemo(
    () =>
      templates
        .filter((t: MessageTemplate) => t.isActive && t.channel === channel)
        .sort((a: MessageTemplate, b: MessageTemplate) => {
          if (a.campaignType === campaignType) return -1;
          if (b.campaignType === campaignType) return 1;
          return 0;
        }),
    [templates, channel, campaignType],
  );

  const channelMessages = React.useMemo(
    () =>
      messages
        .filter((c: Message) => c.channel === channel)
        .sort(
          (a: Message, b: Message) =>
            new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
        ),
    [messages, channel],
  );

  function applyTemplate(t: MessageTemplate) {
    setBody(t.body);
    setCampaignType(t.campaignType as CampaignType);
  }

  function handleSend() {
    const trimmed = body.trim();
    if (!hasConsent || createMessage.isPending) return;
    if (!trimmed && attachments.length === 0) return;

    // Compose final payload: prose + a readable block of attached products.
    // The provider gateway later renders this into a WhatsApp/SMS list or
    // email card; we keep it plain so any channel looks fine.
    const productLines =
      attachments.length === 0
        ? ""
        : "\n\n— Productos —\n" +
          attachments
            .map((p) => {
              const brand = p.brand?.displayName ?? "";
              const price = Number(p.price);
              const priceStr =
                price > 0
                  ? `$${price.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`
                  : "";
              return `• ${brand ? brand + " · " : ""}${p.title}${priceStr ? ` — ${priceStr}` : ""}`;
            })
            .join("\n");

    const finalBody = (trimmed + productLines).slice(0, 5000) || trimmed;

    createMessage.mutate(
      {
        customerId,
        channel,
        body: finalBody,
        campaignType,
        ...(channel === "email" && subject.trim()
          ? { subject: subject.trim().slice(0, 200) }
          : {}),
      },
      {
        onSuccess: () => {
          setBody("");
          setSubject("");
          setAttachments([]);
        },
      },
    );
  }

  const canSend =
    (body.trim().length > 0 || attachments.length > 0) &&
    hasConsent &&
    !createMessage.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Conversación</SheetTitle>
          <SheetDescription>
            Con <span className="text-foreground">{customerName}</span>
          </SheetDescription>
        </SheetHeader>

        <ChannelTabs
          channel={channel}
          onChange={setChannel}
          activeConsents={activeConsents}
        />

        <MessageThread
          messages={channelMessages}
          accent={channelMeta.accent}
          customerName={customerName}
          loading={messagesLoading}
          channel={channel}
          hasConsent={hasConsent}
        />

        <TemplatePicker templates={channelTemplates} onPick={applyTemplate} />

        <div className="shrink-0 space-y-2.5 border-t border-border/40 bg-background px-5 py-4">
          {!hasConsent && (
            <Badge variant="destructive" className="w-full justify-center text-[11px]">
              La clienta no ha dado consentimiento para {channelMeta.label}.
            </Badge>
          )}

          {channel === "email" && (
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto"
              disabled={createMessage.isPending || !hasConsent}
              maxLength={200}
              className={cn(
                "h-9 w-full rounded-lg border border-border bg-transparent px-3 text-sm outline-none",
                "placeholder:text-muted-foreground/50",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                "disabled:opacity-50",
              )}
            />
          )}

          <AttachmentList
            attachments={attachments}
            disabled={createMessage.isPending}
            onRemove={toggleAttachment}
          />

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={createMessage.isPending || !hasConsent}
              aria-label="Adjuntar producto"
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-all",
                "hover:border-foreground/40 hover:text-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
                attachments.length > 0 && "border-foreground text-foreground",
              )}
            >
              <PaperclipIcon className="size-4" />
            </button>

            <div className="flex-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={composerPlaceholder(channel)}
                rows={2}
                maxLength={5000}
                disabled={createMessage.isPending || !hasConsent}
                className={cn(
                  "w-full resize-none rounded-2xl border border-border bg-transparent px-3.5 py-2.5 text-sm leading-snug outline-none transition-colors",
                  "placeholder:text-muted-foreground/50",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                  "disabled:opacity-50",
                )}
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="icon-lg"
              className="shrink-0 rounded-full"
              style={canSend ? { backgroundColor: channelMeta.accent } : undefined}
            >
              {createMessage.isPending ? (
                <span className="text-[10px]">…</span>
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="uppercase tracking-widest">Tipo</span>
            <div className="flex flex-wrap gap-1">
              {CAMPAIGN_TYPES.map((f) => {
                const active = campaignType === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setCampaignType(f.value)}
                    disabled={createMessage.isPending || !hasConsent}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {createMessage.isError && (
            <Badge variant="destructive" className="w-full justify-center">
              No se pudo enviar el mensaje. Intenta otra vez.
            </Badge>
          )}
        </div>

        <AttachmentPicker
          open={pickerOpen}
          attachments={attachments}
          onToggle={toggleAttachment}
          onClose={() => setPickerOpen(false)}
        />

        <SheetClose className="hidden" />
      </SheetContent>
    </Sheet>
  );
}
