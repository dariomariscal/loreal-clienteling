"use client";

import * as React from "react";
import {
  ImageGlyph,
  SpinnerGlyph,
  PlusGlyph,
  StarGlyph,
  StarSolidGlyph,
  TrashGlyph,
  UploadCloudGlyph,
  CloseGlyph,
} from "@/components/ui/glyphs";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadFile, type UploadFolder } from "@/lib/hooks/use-uploads";

interface ProductImageGalleryProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: UploadFolder["folder"];
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

interface ImageItem {
  id: string;
  url?: string;
  progress: number;
  error?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/svg+xml";

export function ProductImageGallery({
  value,
  onChange,
  folder,
  maxFiles = 6,
  disabled,
  className,
}: ProductImageGalleryProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = React.useState<ImageItem[]>(
    value.map((url) => ({ id: url, url, progress: 100 })),
  );
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [reorderFromIndex, setReorderFromIndex] = React.useState<number | null>(
    null,
  );
  const [reorderOverIndex, setReorderOverIndex] = React.useState<number | null>(
    null,
  );

  React.useEffect(() => {
    setItems((prev) => {
      const sameLen = prev.length === value.length;
      const sameUrls = sameLen && prev.every((it, i) => it.url === value[i]);
      if (sameUrls) return prev;
      return value.map((url) => ({ id: url, url, progress: 100 }));
    });
  }, [value]);

  React.useEffect(() => {
    if (activeIndex > items.length - 1) {
      setActiveIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, activeIndex]);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const lastEmittedRef = React.useRef<string>(value.join("|"));
  React.useEffect(() => {
    const urls = items
      .map((it) => it.url)
      .filter((u): u is string => Boolean(u));
    const key = urls.join("|");
    if (key === lastEmittedRef.current) return;
    lastEmittedRef.current = key;
    onChangeRef.current(urls);
  }, [items]);

  const canAddMore = items.length < maxFiles;
  const activeItem = items[activeIndex];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || disabled) return;
    const fileArray = Array.from(files).slice(0, maxFiles - items.length);
    if (fileArray.length === 0) return;

    const newItems: ImageItem[] = fileArray.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      progress: 0,
    }));

    setItems((prev) => {
      if (prev.length === 0) setActiveIndex(0);
      return [...prev, ...newItems];
    });

    await Promise.all(
      fileArray.map(async (file, i) => {
        try {
          const url = await uploadFile(file, folder, (percent) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === newItems[i].id ? { ...it, progress: percent } : it,
              ),
            );
          });
          setItems((prev) =>
            prev.map((it) =>
              it.id === newItems[i].id ? { ...it, url, progress: 100 } : it,
            ),
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Error al subir";
          setItems((prev) =>
            prev.map((it) =>
              it.id === newItems[i].id ? { ...it, error: message } : it,
            ),
          );
        }
      }),
    );
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (activeIndex >= index && activeIndex > 0) {
      setActiveIndex((idx) => idx - 1);
    }
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    setItems((prev) => {
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return next;
    });
    setActiveIndex(0);
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [picked] = next.splice(from, 1);
      next.splice(to, 0, picked);
      return next;
    });
    setActiveIndex(to);
  }

  function handleDropZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || !canAddMore) return;
    handleFiles(e.dataTransfer.files);
  }

  const emptyState = items.length === 0;

  if (emptyState) {
    return (
      <div className={cn("space-y-3", className)}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDropZoneDrop}
          className={cn(
            "relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-input bg-muted/20 px-4 py-6 text-center transition-colors",
            isDragging && "border-accent bg-accent/5",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            disabled={disabled}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
            aria-label="Subir imágenes"
          />
          <UploadCloudGlyph className="size-7 text-muted-foreground/50" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              Arrastra archivos o{" "}
              <span className="text-accent underline">elige</span>
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP o SVG · max 50 MB · hasta {maxFiles} imágenes
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* Primary / active preview — fixed compact size */}
        <div
          className={cn(
            "relative h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/30",
          )}
        >
          {activeItem?.url ? (
            <>
              <img
                src={activeItem.url}
                alt=""
                className="size-full object-cover"
              />
              {activeIndex === 0 && (
                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-foreground/85 px-1.5 py-0.5 text-[10px] font-medium text-background backdrop-blur-sm">
                  <StarSolidGlyph className="size-2.5" />
                  Principal
                </div>
              )}
              {!disabled && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {activeIndex !== 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => makePrimary(activeIndex)}
                      className="h-7 bg-background/90 px-2 text-xs backdrop-blur-sm"
                    >
                      <StarGlyph className="size-3" />
                      Principal
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    onClick={() => remove(activeIndex)}
                    className="size-7 bg-background/90 backdrop-blur-sm"
                    aria-label="Eliminar imagen"
                  >
                    <TrashGlyph className="size-3.5" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2">
              {activeItem?.error ? (
                <p className="px-3 text-center text-xs text-destructive">
                  {activeItem.error}
                </p>
              ) : (
                <>
                  <SpinnerGlyph className="size-5 animate-spin text-muted-foreground" />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {activeItem?.progress ?? 0}%
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Thumbnails column */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {items.map((item, idx) => (
              <Thumbnail
                key={item.id}
                item={item}
                index={idx}
                isActive={idx === activeIndex}
                isPrimary={idx === 0}
                isReorderOver={reorderOverIndex === idx}
                disabled={disabled}
                onSelect={() => setActiveIndex(idx)}
                onRemove={() => remove(idx)}
                onDragStart={() => setReorderFromIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (reorderFromIndex !== null && reorderFromIndex !== idx) {
                    setReorderOverIndex(idx);
                  }
                }}
                onDragLeave={() => {
                  if (reorderOverIndex === idx) setReorderOverIndex(null);
                }}
                onDrop={() => {
                  if (reorderFromIndex !== null) {
                    reorder(reorderFromIndex, idx);
                  }
                  setReorderFromIndex(null);
                  setReorderOverIndex(null);
                }}
                onDragEnd={() => {
                  setReorderFromIndex(null);
                  setReorderOverIndex(null);
                }}
              />
            ))}
            {canAddMore && (
              <AddSlot
                onPick={() => inputRef.current?.click()}
                onDropFiles={handleDropZoneDrop}
                disabled={disabled}
              />
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              disabled={disabled}
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {items.length} de {maxFiles} · La primera imagen es la principal.
            Arrastra las miniaturas para reordenar.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ThumbnailProps {
  item: ImageItem;
  index: number;
  isActive: boolean;
  isPrimary: boolean;
  isReorderOver: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function Thumbnail({
  item,
  isActive,
  isPrimary,
  isReorderOver,
  disabled,
  onSelect,
  onRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: ThumbnailProps) {
  const isLoading = item.progress < 100 && !item.error;
  const hasError = Boolean(item.error);

  return (
    <button
      type="button"
      draggable={!disabled && !!item.url}
      onClick={onSelect}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted/30 transition-all",
        isActive
          ? "border-accent ring-2 ring-accent/30"
          : "border-border/60 hover:border-border",
        isReorderOver && "ring-2 ring-accent",
        !disabled && item.url && "cursor-grab active:cursor-grabbing",
      )}
      aria-label={`Imagen ${isPrimary ? "principal" : ""}`}
    >
      {item.url ? (
        <img src={item.url} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <ImageGlyph className="size-4 text-muted-foreground/40" />
        </div>
      )}

      {isPrimary && item.url && (
        <div className="pointer-events-none absolute left-1 top-1 rounded bg-foreground/85 px-1 py-0.5 text-[8px] font-medium text-background">
          <StarSolidGlyph className="size-2" />
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {item.progress}%
          </span>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
          <span className="text-[9px] text-destructive">Error</span>
        </div>
      )}

      {!disabled && item.url && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-background/90 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
          aria-label="Quitar imagen"
        >
          <CloseGlyph className="size-2.5" />
        </span>
      )}
    </button>
  );
}

function AddSlot({
  onPick,
  onDropFiles,
  disabled,
}: {
  onPick: () => void;
  onDropFiles: (e: React.DragEvent) => void;
  disabled?: boolean;
}) {
  const [over, setOver] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onPick}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        onDropFiles(e);
      }}
      disabled={disabled}
      className={cn(
        "flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-input bg-muted/20 text-muted-foreground transition-colors",
        over && "border-accent bg-accent/5 text-accent",
        !disabled && "hover:border-accent/60 hover:text-foreground",
        disabled && "opacity-50",
      )}
      aria-label="Añadir imagen"
    >
      <PlusGlyph className="size-4" />
      <span className="text-[9px] font-medium">Añadir</span>
    </button>
  );
}
