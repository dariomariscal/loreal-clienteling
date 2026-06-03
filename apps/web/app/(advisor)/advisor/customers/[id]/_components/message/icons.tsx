import type { ChannelValue } from "./constants";

export function ChannelIcon({
  channel,
  className,
}: {
  channel: ChannelValue;
  className?: string;
}) {
  if (channel === "whatsapp") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.95.56 3.76 1.52 5.3L2 22l4.83-1.5A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.5 14.18c-.24.68-1.18 1.27-1.93 1.43-.51.11-1.17.2-3.4-.74-2.84-1.18-4.66-4.07-4.8-4.26-.14-.19-1.13-1.5-1.13-2.86 0-1.36.7-2.03.95-2.31.21-.23.55-.34.86-.34h.62c.2 0 .47-.03.74.56.27.6.92 2.07 1 2.23.08.16.13.34.03.55-.1.21-.15.34-.3.52-.15.18-.32.4-.46.54-.15.15-.3.32-.13.62.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.3.15.47.13.65-.08.18-.21.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.76.83 2.07.98.3.15.5.22.58.34.07.12.07.7-.17 1.38z" />
      </svg>
    );
  }
  if (channel === "sms") {
    return (
      <svg
        className={className}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6l-3 3v-3H4a2 2 0 0 1-2-2V4z" />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="m2.5 4.5 5.5 4 5.5-4" />
    </svg>
  );
}

export function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 14 12-6L2 2v5l8 1-8 1v5z" />
    </svg>
  );
}

export function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 7.5l-4.5 4.5a2.5 2.5 0 0 1-3.5-3.5L8 4a3.5 3.5 0 0 1 5 5L8.5 13.5" />
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}
