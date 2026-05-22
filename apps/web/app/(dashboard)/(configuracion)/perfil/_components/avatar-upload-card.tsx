"use client";

import { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getGlobalError } from "@/lib/auth/clerk-errors";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUploadCard() {
  const { isLoaded, user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  type Status = "idle" | "uploading" | "removing";
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded || !user) return null;

  const busy = status !== "idle";
  const displayedSrc = previewUrl ?? user.imageUrl;
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.primaryEmailAddress?.emailAddress ||
    "?";

  function pick() {
    inputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file || !user) return;

    if (!ACCEPTED.includes(file.type)) {
      setError("Formato no soportado. Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen no debe pesar más de 5 MB.");
      return;
    }

    // Optimistic preview while the upload is in flight.
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setError(null);
    setStatus("uploading");

    try {
      await user.setProfileImage({ file });
      await user.reload();
    } catch (err) {
      setPreviewUrl(null);
      if (isClerkAPIResponseError(err)) {
        setError(getGlobalError(err.errors) ?? "No se pudo subir la imagen.");
      } else {
        setError("No se pudo subir la imagen. Intenta de nuevo.");
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
      setStatus("idle");
    }
  }

  async function onRemove() {
    if (!user) return;
    setStatus("removing");
    setError(null);
    try {
      await user.setProfileImage({ file: null });
      await user.reload();
      setPreviewUrl(null);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(getGlobalError(err.errors) ?? "No se pudo quitar la imagen.");
      } else {
        setError("No se pudo quitar la imagen. Intenta de nuevo.");
      }
    } finally {
      setStatus("idle");
    }
  }

  // Clerk seeds every user with an auto-generated default avatar URL
  // (`img.clerk.com/...?type=default`), so `hasImage === false` even when
  // `imageUrl` is set. Use `hasImage` to decide whether "Quitar" makes sense.
  const showRemove = user.hasImage;
  const uploading: boolean = status === "uploading";
  const removing: boolean = status === "removing";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto de perfil</CardTitle>
        <CardDescription>
          Una imagen cuadrada de al menos 200×200 px. JPG, PNG o WebP, máx 5 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            aria-label="Cambiar foto de perfil"
            className="group relative rounded-full outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Avatar name={displayName} src={displayedSrc} size="xl" />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-foreground/55 text-background opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {uploading ? <Spinner /> : <CameraIcon className="size-5" />}
            </span>
          </button>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={pick}
                disabled={busy}
              >
                {uploading ? "Subiendo…" : "Cambiar foto"}
              </Button>
              {showRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  disabled={busy}
                >
                  {removing ? "Quitando…" : "Quitar"}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tu foto se mostrará en el sidebar y en tu perfil.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          onChange={onFileChange}
        />

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="size-5 animate-spin"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.55" />
    </svg>
  );
}
