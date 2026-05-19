"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const HEX_REGEX = /^#([0-9A-F]{3}){1,2}$/i

interface ColorPickerProps {
  value?: string
  onChange?: (value: string) => void
  presets?: string[]
  disabled?: boolean
  className?: string
  name?: string
  id?: string
}

const DEFAULT_PRESETS = [
  "#1a1a1a",
  "#c8a04d",
  "#b8860b",
  "#0a4c8c",
  "#7c1f3d",
  "#c2185b",
  "#388e3c",
  "#5d4037",
]

function ColorPicker({
  value = "",
  onChange,
  presets = DEFAULT_PRESETS,
  disabled,
  className,
  name,
  id,
}: ColorPickerProps) {
  const isValid = !value || HEX_REGEX.test(value)
  const swatchColor = isValid && value ? value : "transparent"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label
        className={cn(
          "relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-input transition-colors hover:border-foreground/20",
          disabled && "pointer-events-none opacity-50",
        )}
        style={{
          backgroundColor: swatchColor,
          backgroundImage:
            !value || !isValid
              ? "linear-gradient(45deg, var(--color-muted) 25%, transparent 25%, transparent 75%, var(--color-muted) 75%), linear-gradient(45deg, var(--color-muted) 25%, transparent 25%, transparent 75%, var(--color-muted) 75%)"
              : undefined,
          backgroundSize: !value || !isValid ? "8px 8px" : undefined,
          backgroundPosition: !value || !isValid ? "0 0, 4px 4px" : undefined,
        }}
      >
        <input
          type="color"
          value={isValid && value ? value : "#000000"}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label="Seleccionar color"
        />
      </label>

      <Input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="#000000"
        disabled={disabled}
        className="font-mono uppercase"
        aria-invalid={!isValid}
      />

      {presets.length > 0 && (
        <div className="flex shrink-0 gap-1">
          {presets.slice(0, 6).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange?.(preset)}
              disabled={disabled}
              className="size-5 rounded-md ring-1 ring-foreground/10 transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-50"
              style={{ backgroundColor: preset }}
              aria-label={`Usar ${preset}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { ColorPicker }
