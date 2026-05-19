"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  emptyMessage?: string
}

function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  disabled,
  className,
  id,
  emptyMessage = "Sin opciones",
}: MultiSelectProps) {
  const [search, setSearch] = React.useState("")
  const optionsByValue = React.useMemo(
    () => Object.fromEntries(options.map((o) => [o.value, o])),
    [options],
  )
  const selected = value.map((v) => optionsByValue[v]).filter(Boolean)

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  )

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  function remove(optionValue: string) {
    onChange(value.filter((v) => v !== optionValue))
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        id={id}
        disabled={disabled}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-xl border border-input bg-transparent px-3 py-2 text-left text-sm transition-all duration-200 outline-none hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        {selected.length === 0 && (
          <span className="text-muted-foreground/60">{placeholder}</span>
        )}
        {selected.map((opt) => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {opt.icon}
            {opt.label}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                remove(opt.value)
              }}
              className="rounded-full p-0.5 hover:bg-foreground/10"
              aria-label={`Quitar ${opt.label}`}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <ChevronDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={6} className="z-50">
          <Popover.Popup className="w-[var(--anchor-width)] min-w-[220px] overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg ring-1 ring-foreground/[0.06] outline-none">
            <div className="border-b border-border/60 p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="h-8 w-full rounded-lg bg-muted/40 px-2.5 text-sm outline-none focus-visible:bg-muted/60"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                filtered.map((opt) => {
                  const isSelected = value.includes(opt.value)
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                        isSelected && "bg-muted/60",
                      )}
                    >
                      <span className="flex size-4 items-center justify-center">
                        {isSelected && <CheckIcon className="size-3.5" />}
                      </span>
                      {opt.icon}
                      <span className="flex-1 text-left">{opt.label}</span>
                    </button>
                  )
                })
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { MultiSelect }
