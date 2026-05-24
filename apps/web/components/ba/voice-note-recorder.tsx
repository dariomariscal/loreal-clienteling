"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VoiceNoteRecorderProps {
  onRecorded: (audio: Blob, mimeType: string) => void;
  disabled?: boolean;
  className?: string;
}

// VISUAL DEVICE: inline recorder with waveform pulse.
//
// Single icon button when idle. While recording, expands to an inline
// strip with the pulse + timer + stop/cancel. Deliberately NOT a modal —
// keeping it inline preserves context (the BA is still next to the
// customer; the note is captured in flow, not extracted).
export function VoiceNoteRecorder({ onRecorded, disabled, className }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      console.warn("MediaRecorder not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecorded(blob, mimeType);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err) {
      console.warn("Could not start recording", err);
    }
  }

  function stop() {
    if (tickRef.current) clearInterval(tickRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function cancel() {
    if (tickRef.current) clearInterval(tickRef.current);
    chunksRef.current = [];
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  }

  if (!isRecording) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={start}
        disabled={disabled}
        className={cn("text-muted-foreground hover:text-foreground", className)}
        aria-label="Grabar nota de voz"
      >
        <MicGlyphInline className="size-4" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[var(--ba-accent)]/30 bg-[var(--ba-accent-soft)]/40 px-3 py-1.5",
        className,
      )}
    >
      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[var(--ba-accent)]" aria-hidden />
      <span className="font-mono text-[12px] tabular-nums text-foreground">{formatElapsed(elapsed)}</span>
      <button
        type="button"
        onClick={cancel}
        className="text-[12px] text-muted-foreground transition-colors hover:text-destructive"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={stop}
        className="text-[12px] font-medium text-[var(--ba-accent)] transition-colors hover:underline"
      >
        Terminar
      </button>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickSupportedMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "audio/webm";
}

// ── Inline glyph (mic) — kept local; one-off use ───────────────────

function MicGlyphInline(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
