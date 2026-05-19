import * as React from "react"

import { cn } from "@/lib/utils"

const SIZE_CLASSES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  default: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
} as const

type AvatarSize = keyof typeof SIZE_CLASSES

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string
  src?: string | null
  size?: AvatarSize
}

/**
 * Avatar — initials + hash-derived background color when no src.
 * Hash uses the full name (not just initials) to avoid color collisions.
 */
function Avatar({
  name,
  src,
  size = "default",
  className,
  ...props
}: AvatarProps) {
  const initials = getInitials(name)
  const bg = src ? undefined : hslFromString(name)

  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium select-none",
        SIZE_CLASSES[size],
        className,
      )}
      style={bg ? { backgroundColor: bg.background, color: bg.foreground } : undefined}
      aria-label={name}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function hslFromString(value: string): { background: string; foreground: string } {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return {
    background: `hsl(${hue} 45% 65%)`,
    foreground: `hsl(${hue} 60% 18%)`,
  }
}

export { Avatar }
