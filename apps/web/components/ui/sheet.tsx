"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CloseGlyph } from "@/components/ui/glyphs"

type Side = "right" | "left" | "bottom"
type Size = "sm" | "default" | "lg" | "xl"

const SIZE_CLASSES: Record<Size, string> = {
  sm: "sm:max-w-[400px]",
  default: "sm:max-w-[480px]",
  lg: "sm:max-w-[640px]",
  xl: "sm:max-w-[800px]",
}

// Bottom sheets are width-bound rather than width-restricted: they hug the
// viewport on phones and cap on tablets so the camera stage behind remains
// visible on landscape iPad — the scan flow's defining peek behavior.
const BOTTOM_SIZE_CLASSES: Record<Size, string> = {
  sm: "sm:max-w-[480px]",
  default: "sm:max-w-[560px]",
  lg: "sm:max-w-[720px]",
  xl: "sm:max-w-[920px]",
}

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetClose({
  children,
  ...props
}: DialogPrimitive.Close.Props) {
  if (React.isValidElement(children)) {
    return (
      <DialogPrimitive.Close
        data-slot="sheet-close"
        render={children}
        {...props}
      />
    )
  }
  return (
    <DialogPrimitive.Close data-slot="sheet-close" {...props}>
      {children}
    </DialogPrimitive.Close>
  )
}

function SheetOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-200 supports-backdrop-filter:backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  size = "default",
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  side?: Side
  size?: Size
  showCloseButton?: boolean
}) {
  const sideClasses =
    side === "right"
      ? "inset-y-0 right-0 border-l data-open:slide-in-from-right data-closed:slide-out-to-right"
      : side === "left"
        ? "inset-y-0 left-0 border-r data-open:slide-in-from-left data-closed:slide-out-to-left"
        // Bottom: anchored bottom-center, rounded top corners, max 92dvh so the
        // camera behind stays peekable on iPad landscape.
        : "inset-x-0 bottom-0 mx-auto max-h-[92dvh] rounded-t-3xl border-t data-open:slide-in-from-bottom data-closed:slide-out-to-bottom"

  const isBottom = side === "bottom"

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex w-full flex-col gap-0 bg-popover text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/6 outline-none duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-open:animate-in data-closed:animate-out",
          isBottom ? "h-auto" : "h-full",
          sideClasses,
          isBottom ? BOTTOM_SIZE_CLASSES[size] : SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {isBottom ? (
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-foreground/15"
          />
        ) : null}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <CloseGlyph className="size-4" />
            <span className="sr-only">Cerrar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex flex-col gap-1 border-b border-border/60 px-6 py-5",
        className
      )}
      {...props}
    />
  )
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("flex-1 space-y-5 overflow-y-auto px-6 py-5", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "flex items-center justify-end gap-2.5 border-t border-border/60 bg-muted/30 px-6 py-4",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
}
