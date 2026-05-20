"use client"

import * as React from "react"
import { UploadCloudIcon, XIcon, ImageIcon, Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { uploadFile, type UploadFolder } from "@/lib/hooks/use-uploads"

interface DropzoneProps {
  value: string[]
  onChange: (urls: string[]) => void
  folder: UploadFolder["folder"]
  maxFiles?: number
  accept?: string
  disabled?: boolean
  className?: string
  /** When true, single-file mode: shows one large preview tile. */
  single?: boolean
}

interface FileItem {
  id: string
  url?: string
  progress: number
  error?: string
}

/**
 * Dropzone — drag and drop + file picker fallback.
 * Uploads to R2 via presigned URL flow.
 */
function Dropzone({
  value,
  onChange,
  folder,
  maxFiles = 8,
  accept = "image/jpeg,image/png,image/webp,image/svg+xml",
  disabled,
  className,
  single = false,
}: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [items, setItems] = React.useState<FileItem[]>(
    value.map((url) => ({ id: url, url, progress: 100 })),
  )
  const [isDragging, setIsDragging] = React.useState(false)

  React.useEffect(() => {
    // Reconcile with external value changes (e.g. form reset)
    setItems((prev) => {
      const sameLen = prev.length === value.length
      const sameUrls = sameLen && prev.every((it, i) => it.url === value[i])
      if (sameUrls) return prev
      return value.map((url) => ({ id: url, url, progress: 100 }))
    })
  }, [value])

  const effectiveMax = single ? 1 : maxFiles
  const canAddMore = items.length < effectiveMax

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files).slice(0, effectiveMax - items.length)
    const newItems: FileItem[] = fileArray.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      progress: 0,
    }))

    setItems((prev) => (single ? newItems : [...prev, ...newItems]))

    const uploaded = await Promise.all(
      fileArray.map(async (file, i) => {
        try {
          const url = await uploadFile(file, folder, (percent) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === newItems[i].id ? { ...it, progress: percent } : it,
              ),
            )
          })
          setItems((prev) =>
            prev.map((it) =>
              it.id === newItems[i].id ? { ...it, url, progress: 100 } : it,
            ),
          )
          return url
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error al subir"
          setItems((prev) =>
            prev.map((it) =>
              it.id === newItems[i].id ? { ...it, error: message } : it,
            ),
          )
          return null
        }
      }),
    )

    const successUrls = uploaded.filter((u): u is string => Boolean(u))
    onChange(single ? successUrls : [...value, ...successUrls])
  }

  function remove(id: string) {
    const item = items.find((it) => it.id === id)
    setItems((prev) => prev.filter((it) => it.id !== id))
    if (item?.url) {
      onChange(value.filter((u) => u !== item.url))
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || !canAddMore) return
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop area + file picker */}
      {canAddMore && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/20 px-4 py-8 text-center transition-colors",
            isDragging && "border-accent bg-accent/5",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={!single}
            disabled={disabled}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ""
            }}
            aria-label="Subir archivos"
          />
          <UploadCloudIcon className="size-8 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Arrastra archivos o{" "}
              <span className="text-accent underline">elige uno</span>
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP o SVG · max 50 MB
            </p>
          </div>
        </div>
      )}

      {/* Previews */}
      {items.length > 0 && (
        <div
          className={cn(
            "grid gap-2",
            single ? "grid-cols-1" : "grid-cols-3 sm:grid-cols-4",
          )}
        >
          {items.map((item) => (
            <FilePreview
              key={item.id}
              item={item}
              onRemove={() => remove(item.id)}
              disabled={disabled}
              single={single}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilePreview({
  item,
  onRemove,
  disabled,
  single,
}: {
  item: FileItem
  onRemove: () => void
  disabled?: boolean
  single?: boolean
}) {
  const isLoading = item.progress < 100 && !item.error
  const hasError = Boolean(item.error)

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-muted/30",
        single ? "h-40" : "aspect-square",
      )}
    >
      {item.url ? (
        <img
          src={item.url}
          alt=""
          className={cn(
            "size-full",
            single ? "object-contain p-4" : "object-cover",
          )}
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <ImageIcon className="size-8 text-muted-foreground/40" />
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          <span className="text-xs tabular-nums text-muted-foreground">
            {item.progress}%
          </span>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-2 text-center">
          <span className="text-xs text-destructive">{item.error}</span>
        </div>
      )}

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="absolute right-1 top-1 size-6 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
          aria-label="Quitar archivo"
        >
          <XIcon className="size-3" />
        </Button>
      )}
    </div>
  )
}

export { Dropzone }
