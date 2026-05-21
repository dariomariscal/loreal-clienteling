"use client"

import { cn } from "@/lib/utils"
import { getMapboxToken } from "@/lib/hooks/use-geocoding"
import { MapPinGlyph } from "@/components/ui/glyphs"

interface StaticMapProps {
  lat?: number | null
  lng?: number | null
  zoom?: number
  width?: number
  height?: number
  className?: string
}

/**
 * Mapbox Static Images API: lightweight visual confirmation of a pinned location.
 * Shows a placeholder card when coordinates or token are missing.
 */
function StaticMap({
  lat,
  lng,
  zoom = 14,
  width = 600,
  height = 240,
  className,
}: StaticMapProps) {
  const token = getMapboxToken()
  const hasCoords = typeof lat === "number" && typeof lng === "number"

  if (!token || !hasCoords) {
    return (
      <div
        className={cn(
          "flex aspect-[5/2] w-full items-center justify-center rounded-xl border border-dashed border-input bg-muted/20",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <MapPinGlyph className="size-6 opacity-40" />
          <span className="text-xs">
            {token
              ? "Selecciona una dirección para ver el mapa"
              : "Mapa no disponible (token faltante)"}
          </span>
        </div>
      </div>
    )
  }

  const pinSpec = `pin-l+c8a04d(${lng},${lat})`
  const center = `${lng},${lat}`
  const url = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${pinSpec}/${center},${zoom}/${width}x${height}@2x?access_token=${token}`

  return (
    <img
      src={url}
      alt={`Mapa en ${lat}, ${lng}`}
      width={width}
      height={height}
      className={cn(
        "aspect-[5/2] w-full rounded-xl border border-border/60 object-cover",
        className,
      )}
      loading="lazy"
    />
  )
}

export { StaticMap }
