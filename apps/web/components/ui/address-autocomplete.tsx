"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { MapPinIcon, Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  useAddressSuggestions,
  retrieveAddress,
  getMapboxToken,
  type GeocodingResult,
} from "@/lib/hooks/use-geocoding"

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (result: GeocodingResult) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

/**
 * Address input with Mapbox Search Box autocomplete (Mexico-only).
 * Falls back to plain input when NEXT_PUBLIC_MAPBOX_TOKEN is not configured.
 */
function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Av. Molière 222, Polanco",
  disabled,
  className,
  id,
}: AddressAutocompleteProps) {
  const hasToken = Boolean(getMapboxToken())
  const sessionToken = React.useMemo(() => crypto.randomUUID(), [])
  const [open, setOpen] = React.useState(false)
  const anchorRef = React.useRef<HTMLDivElement>(null)
  const { suggestions, isLoading } = useAddressSuggestions(value, sessionToken)

  React.useEffect(() => {
    setOpen(suggestions.length > 0)
  }, [suggestions.length])

  async function handleSelect(mapboxId: string, displayText: string) {
    setOpen(false)
    onChange(displayText)
    const result = await retrieveAddress(mapboxId, sessionToken)
    if (result) onSelect(result)
  }

  if (!hasToken) {
    return (
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
    )
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div ref={anchorRef} className="relative">
        <MapPinIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-9", className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2Icon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <Popover.Portal>
        <Popover.Positioner anchor={anchorRef} sideOffset={6} className="z-50">
          <Popover.Popup className="w-[var(--anchor-width)] min-w-[280px] overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg ring-1 ring-foreground/[0.06] outline-none">
            <ul className="max-h-72 overflow-y-auto p-1">
              {suggestions.map((s) => (
                <li key={s.mapboxId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s.mapboxId, `${s.name}, ${s.placeFormatted}`)}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">
                      <span className="block font-medium">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {s.placeFormatted}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { AddressAutocomplete }
