"use client";

import * as React from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";

interface ScanLiveCameraProps {
  /** Called every time zxing decodes a new code from the live preview. */
  onDetected: (code: string) => void;
  /**
   * When true, the underlying camera is released. The parent flips this while
   * the bottom sheet is open so we don't keep decoding (and don't keep the
   * camera light on) over the result UI.
   */
  paused?: boolean;
  /**
   * Cool-down between consecutive detections in ms. Without it, the same
   * barcode held in frame would fire `onDetected` ~5 times per second.
   */
  cooldownMs?: number;
}

type CameraState =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "running"; facingMode: "environment" | "user" }
  | { kind: "denied" }
  | { kind: "unavailable"; message: string };

/**
 * Reject decoded strings that can't plausibly be one of our codes. zxing
 * occasionally returns ASCII garbage from a noisy frame that happens to pass
 * the CODE-128 checksum (`/.;4) ·` was the real-world example). Our barcodes
 * are 6–20 chars of `A–Z 0–9 - _ .`; anything else is a misread.
 */
function isPlausibleCode(code: string): boolean {
  if (code.length < 6 || code.length > 24) return false;
  return /^[A-Za-z0-9\-_.]+$/.test(code);
}

/**
 * Live barcode preview. Renders a `<video>` filling its container and runs a
 * zxing decode loop on the stream. Tries the rear camera first
 * (`facingMode: "environment"`) and falls back to the front camera when the
 * device doesn't have a rear one — that's the laptop case the user hit, where
 * the rear-camera request resolves to a black frame or rejects outright.
 *
 * Cleanup is essential: leaving the MediaStream live keeps the indicator LED
 * on after navigating away, which terrifies users. We always stop every
 * track from every previous attempt on unmount and on every restart.
 */
export function ScanLiveCamera({
  onDetected,
  paused = false,
  cooldownMs = 1500,
}: ScanLiveCameraProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const readerRef = React.useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = React.useRef<{ stop: () => void } | null>(null);
  const lastDetectionRef = React.useRef<{ code: string; at: number }>({
    code: "",
    at: 0,
  });
  // We require the decoder to land on the same code twice in a row before
  // accepting it. Without this, zxing occasionally misreads a partial CODE128
  // frame as ASCII garbage (`/.;4) ·`) — that ghost result was good enough to
  // satisfy the symbology's checksum but obviously didn't match any SKU.
  const candidateRef = React.useRef<{ code: string; count: number }>({
    code: "",
    count: 0,
  });

  const [state, setState] = React.useState<CameraState>({ kind: "idle" });

  // Single source of truth for stopping the camera + decoder. Called from
  // every cleanup path (unmount, pause toggle, restart on retry).
  const stop = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const start = React.useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({
        kind: "unavailable",
        message: "Tu navegador no permite usar la cámara.",
      });
      return;
    }

    setState({ kind: "requesting" });
    stop();

    // Try rear camera first, then front. We use `ideal` rather than `exact`
    // so a desktop without a rear camera still gets *some* device instead of
    // a NotFoundError; we then read which one we actually got.
    let stream: MediaStream | null = null;
    let facingMode: "environment" | "user" = "environment";
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch {
      stream = null;
    }

    // If we got a stream, confirm it's actually the rear camera; if the
    // device only has a front camera, getUserMedia silently picks it and
    // returns the front feed labeled as such.
    if (stream) {
      const settings = stream.getVideoTracks()[0]?.getSettings();
      if (settings?.facingMode === "user") {
        facingMode = "user";
      }
    } else {
      // No environment camera at all — explicitly request the front one.
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        facingMode = "user";
      } catch (err) {
        if ((err as DOMException)?.name === "NotAllowedError") {
          setState({ kind: "denied" });
        } else {
          setState({
            kind: "unavailable",
            message: "No encontramos ninguna cámara disponible.",
          });
        }
        return;
      }
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stop();
      return;
    }
    video.srcObject = stream;
    await video.play().catch(() => undefined);

    // Narrow zxing to the symbologies our database actually contains:
    // YSL barcodes are EAN-13 (13 numeric digits) and Lancôme uses CODE-128
    // (alphanumeric like `361427300450C`). Dropping CODE_39 and QR removes
    // two common sources of false positives that share a checksum space with
    // CODE_128's noise. UPC_A/E stay enabled so US-region SKUs still scan.
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);
    // TRY_HARDER trades CPU for accuracy — turning it off lets the decoder
    // reject noisy frames faster instead of straining to "interpret" them.
    hints.set(DecodeHintType.TRY_HARDER, false);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;
    // decodeFromStream takes the MediaStream we already negotiated (so the
    // rear/front fallback decision sticks) and binds the live preview to the
    // <video> element, then runs the decode loop until controls.stop().
    const controls = await reader.decodeFromStream(
      stream,
      video,
      (result, err) => {
        if (result) {
          const code = result.getText().trim();
          if (!isPlausibleCode(code)) {
            // Reject obvious garbage frames (e.g. `/.;4) ·`). Don't even
            // count them toward the consistency check or they would block
            // a legit reading right after.
            candidateRef.current = { code: "", count: 0 };
            return;
          }

          // Require the same code on two consecutive frames before firing.
          // This is the simplest filter that defeats one-off misreads while
          // adding ~100ms of latency on a real scan.
          if (candidateRef.current.code === code) {
            candidateRef.current.count += 1;
          } else {
            candidateRef.current = { code, count: 1 };
            return;
          }
          if (candidateRef.current.count < 2) return;

          const now = Date.now();
          if (
            lastDetectionRef.current.code === code &&
            now - lastDetectionRef.current.at < cooldownMs
          ) {
            return;
          }
          lastDetectionRef.current = { code, at: now };
          candidateRef.current = { code: "", count: 0 };
          onDetected(code);
        }
        // NotFoundException is the "no code in this frame" path — fired on
        // every frame without a match. Don't surface it.
        if (err && !(err instanceof NotFoundException)) {
          // eslint-disable-next-line no-console
          console.debug("[scan] decode error", err);
        }
      },
    );
    controlsRef.current = controls;
    setState({ kind: "running", facingMode });
  }, [stop, onDetected, cooldownMs]);

  // Boot the camera on mount. Re-run when pause flips off after being on.
  React.useEffect(() => {
    if (paused) {
      stop();
      return;
    }
    start();
    return stop;
  }, [paused, start, stop]);

  // Last-ditch safety: if the component is destroyed while the request is in
  // flight, the cleanup above already handles it; this is here so React's
  // strict-mode double-invoke during dev doesn't leak a track.
  React.useEffect(() => stop, [stop]);

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="absolute inset-0 size-full object-cover"
      />

      {/* Overlay messaging for any state where the preview isn't producing
          a useful frame — kept dim so the viewfinder mask above stays the
          focal point when the camera is alive. */}
      {state.kind !== "running" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/85 text-center text-background">
          <div className="max-w-xs px-6">
            {state.kind === "requesting" || state.kind === "idle" ? (
              <p className="text-sm">Iniciando cámara…</p>
            ) : state.kind === "denied" ? (
              <>
                <p className="text-sm font-medium">
                  Necesitamos permiso para usar la cámara
                </p>
                <p className="mt-2 text-xs opacity-80">
                  Activa el acceso desde la barra del navegador y vuelve a
                  intentar.
                </p>
                <button
                  type="button"
                  onClick={start}
                  className="mt-4 rounded-full bg-background/15 px-4 py-1.5 text-xs font-medium text-background ring-1 ring-background/30 hover:bg-background/25"
                >
                  Reintentar
                </button>
              </>
            ) : (
              <p className="text-sm">{state.message}</p>
            )}
          </div>
        </div>
      ) : null}

      {/* Tiny indicator so the BA knows whether she's looking at the rear
          or the front camera. Important on laptops where the only option
          is the front cam — without it she'd flip the laptop around
          confused. */}
      {state.kind === "running" ? (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-foreground/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-background">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-emerald-400"
          />
          {state.facingMode === "user" ? "Cámara frontal" : "Cámara trasera"}
        </span>
      ) : null}
    </div>
  );
}
