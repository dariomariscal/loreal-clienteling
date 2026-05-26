"use client";

import { cn } from "@/lib/utils";

export type PreviewChannel = "whatsapp" | "sms" | "email";

interface DevicePreviewProps {
  channel: PreviewChannel;
  /** The template body. Merge tags like `{{firstName}}` render literally. */
  body: string;
  /** Sender label — store + brand or "L'Oréal". */
  senderName?: string;
  /** Email subject — used only when channel === "email". */
  subject?: string;
  /** Brand primary color — paints email header and WhatsApp accent dots. */
  brandPrimary?: string | null;
  /** Brand accent color — paints email CTA. */
  brandAccent?: string | null;
  /** Optional brand logo for the email header. */
  brandLogoUrl?: string | null;
  className?: string;
}

/**
 * Channel-specific live preview of a message template body. Mirrors the
 * pattern Twilio Content Templates and SuprSend use: editor on one side,
 * a phone/inbox mock on the other. The frame is purely cosmetic — we
 * don't try to round-trip Markdown or HTML; the goal is "does the BA see
 * this length, tone and CTA in the right place?".
 */
export function DevicePreview({
  channel,
  body,
  senderName = "L'Oréal",
  subject,
  brandPrimary,
  brandAccent,
  brandLogoUrl,
  className,
}: DevicePreviewProps) {
  if (channel === "whatsapp") {
    return (
      <WhatsappFrame body={body} senderName={senderName} className={className} />
    );
  }
  if (channel === "sms") {
    return (
      <SmsFrame body={body} senderName={senderName} className={className} />
    );
  }
  return (
    <EmailFrame
      body={body}
      senderName={senderName}
      subject={subject}
      primary={brandPrimary}
      accent={brandAccent}
      logoUrl={brandLogoUrl}
      className={className}
    />
  );
}

// ── WhatsApp ───────────────────────────────────────────────────────────────

function WhatsappFrame({
  body,
  senderName,
  className,
}: {
  body: string;
  senderName: string;
  className?: string;
}) {
  return (
    <DeviceShell label={`WhatsApp · ${senderName}`} className={className}>
      <div
        className="h-full w-full p-3"
        style={{
          background:
            "linear-gradient(135deg, #d9d4cb 0%, #e7e2d8 50%, #d9d4cb 100%)",
        }}
      >
        <div className="ml-1 flex max-w-[85%] flex-col gap-1">
          <div className="relative rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm">
            <p className="whitespace-pre-wrap text-[13px] leading-snug text-foreground">
              {body || (
                <span className="text-muted-foreground">
                  Tu mensaje aparecerá aquí.
                </span>
              )}
            </p>
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              ahora
            </p>
          </div>
        </div>
      </div>
    </DeviceShell>
  );
}

// ── SMS ────────────────────────────────────────────────────────────────────

function SmsFrame({
  body,
  senderName,
  className,
}: {
  body: string;
  senderName: string;
  className?: string;
}) {
  return (
    <DeviceShell label={`SMS · ${senderName}`} className={className}>
      <div className="h-full w-full bg-background p-3">
        <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          Mensajes · ahora
        </p>
        <div className="ml-1 flex max-w-[85%] flex-col gap-1">
          <div className="rounded-2xl rounded-bl-sm bg-muted/70 px-3 py-2">
            <p className="whitespace-pre-wrap text-[13px] leading-snug text-foreground">
              {body || (
                <span className="text-muted-foreground">
                  Tu mensaje aparecerá aquí.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </DeviceShell>
  );
}

// ── Email ──────────────────────────────────────────────────────────────────

function EmailFrame({
  body,
  senderName,
  subject,
  primary,
  accent,
  logoUrl,
  className,
}: {
  body: string;
  senderName: string;
  subject?: string;
  primary?: string | null;
  accent?: string | null;
  logoUrl?: string | null;
  className?: string;
}) {
  const headerBg = primary?.trim() || "#1a1a1a";
  const ctaBg = accent?.trim() || "#c8a04d";

  return (
    <DeviceShell label={`Email · ${senderName}`} className={className}>
      <div className="h-full w-full bg-background">
        <div className="border-b border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <p className="truncate">
            <span className="font-semibold text-foreground">{senderName}</span>{" "}
            · ahora
          </p>
          {subject ? (
            <p className="truncate font-medium text-foreground">{subject}</p>
          ) : (
            <p className="truncate text-muted-foreground/70">(Sin asunto)</p>
          )}
        </div>

        <div
          className="flex h-14 items-center justify-center px-4 text-white"
          style={{ backgroundColor: headerBg }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={senderName}
              className="max-h-8 max-w-full object-contain"
            />
          ) : (
            <span className="font-[family-name:var(--font-heading)] text-sm font-medium">
              {senderName}
            </span>
          )}
        </div>

        <div className="px-4 py-4">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
            {body || (
              <span className="text-muted-foreground">
                Tu mensaje aparecerá aquí.
              </span>
            )}
          </p>
          <div className="mt-4 flex">
            <span
              className="inline-flex items-center rounded-md px-4 py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: ctaBg }}
            >
              Reservar mi cita
            </span>
          </div>
        </div>
      </div>
    </DeviceShell>
  );
}

// ── Shared device shell ────────────────────────────────────────────────────

function DeviceShell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="rounded-[28px] border-[6px] border-foreground/85 bg-foreground p-1 shadow-xl">
        <div className="aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-[22px] bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
