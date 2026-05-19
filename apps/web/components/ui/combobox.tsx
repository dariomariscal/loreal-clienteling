"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { CheckIcon, ChevronDownIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  id?: string
  /**
   * When provided, shows a "+ Create '<query>'" item at the bottom of the list.
   * Receives the current search query.
   */
  onCreate?: (query: string) => void
  createLabel?: (query: string) => string
}

function Combobox({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  emptyMessage = "Sin resultados",
  searchPlaceholder = "Buscar...",
  disabled,
  className,
  id,
  onCreate,
  createLabel = (q) => `Crear "${q}"`,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selected = options.find((o) => o.value === value)
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  )

  function handleSelect(optionValue: string) {
    onChange(optionValue)
    setSearch("")
    setOpen(false)
  }

  function handleCreate() {
    if (!onCreate || !search.trim()) return
    onCreate(search.trim())
    setSearch("")
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-transparent px-3.5 text-left text-sm transition-all duration-200 outline-none hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        {selected ? (
          <span className="flex flex-1 items-center gap-2 truncate">
            {selected.icon}
            <span className="truncate">{selected.label}</span>
          </span>
        ) : (
          <span className="flex-1 truncate text-muted-foreground/60">
            {placeholder}
          </span>
        )}
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={6} className="z-50">
          <Popover.Popup className="w-[var(--anchor-width)] min-w-[220px] overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg ring-1 ring-foreground/[0.06] outline-none">
            <div className="border-b border-border/60 p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-lg bg-muted/40 px-2.5 text-sm outline-none focus-visible:bg-muted/60"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {filtered.length === 0 && !onCreate && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {emptyMessage}
                </div>
              )}
              {filtered.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                      isSelected && "bg-muted/60",
                    )}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center pt-0.5">
                      {isSelected && <CheckIcon className="size-3.5" />}
                    </span>
                    {opt.icon}
                    <span className="flex-1 text-left">
                      <span className="block">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-xs text-muted-foreground">
                          {opt.description}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
              {onCreate && search.trim() && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border/60 px-2 py-1.5 pt-2 text-sm font-medium text-accent transition-colors hover:bg-muted"
                >
                  <PlusIcon className="size-3.5" />
                  {createLabel(search.trim())}
                </button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { Combobox }
