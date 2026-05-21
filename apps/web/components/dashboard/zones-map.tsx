"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { cn } from "@/lib/utils";
import { getMapboxToken } from "@/lib/hooks/use-geocoding";
import {
  useMunicipalityBoundaries,
  type BoundariesFeatureCollection,
} from "@/lib/hooks/use-geo";
import type { Zone } from "@/lib/hooks/use-zones";
import type { Store } from "@/lib/hooks/use-stores";

// ── Types ──────────────────────────────────────────────────────────

export interface ZonesMapProps {
  zones: Zone[];
  stores: Store[];
  /** Municipality IDs currently selected (highlighted with selection ring). */
  selectedMunicipalityIds?: string[];
  /** Toggle municipality on click. Receives the new full set of selected IDs. */
  onMunicipalitySelectionChange?: (ids: string[]) => void;
  /** Visual highlight color applied to selected municipalities (used in zone editor). */
  selectionColor?: string;
  /** When set, only this zone is highlighted; others fade. */
  focusedZoneId?: string | null;
  className?: string;
  /** Initial center; defaults to the geographic center of Mexico. */
  initialCenter?: [number, number];
  initialZoom?: number;
}

const FALLBACK_COLOR = "#E5E7EB"; // neutral gray for unassigned municipalities

// ── Helpers ────────────────────────────────────────────────────────

function buildMunicipalityFillColor(
  zones: Zone[],
  selectedIds: string[],
  selectionColor: string,
) {
  // Mapbox `match` requires unique branch labels, so collapse to a map.
  // Selection wins over zone color (applied last).
  const colorById = new Map<string, string>();

  for (const z of zones) {
    for (const mid of z.municipalityIds) {
      colorById.set(mid, z.color);
    }
  }
  for (const id of selectedIds) {
    colorById.set(id, selectionColor);
  }

  if (colorById.size === 0) {
    return FALLBACK_COLOR;
  }

  const pairs: string[] = [];
  for (const [id, color] of colorById) {
    pairs.push(id, color);
  }

  return [
    "match",
    ["get", "id"],
    ...pairs,
    FALLBACK_COLOR,
  ] as unknown as mapboxgl.ExpressionSpecification;
}

/**
 * Lucide `Store` icon, inlined so we don't have to pull React into a Mapbox
 * marker DOM node. Kept as the raw SVG path for fidelity.
 */
const STORE_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
  <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
  <path d="M2 7h20"/>
  <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.5.5 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.5.5 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.5.5 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.5.5 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
</svg>
`.trim();

interface StorePoint {
  id: string;
  name: string;
  chain: string;
  color: string;
  lat: number;
  lng: number;
}

function buildStorePoints(stores: Store[], zones: Zone[]): StorePoint[] {
  const zoneColorById = new Map(zones.map((z) => [z.id, z.color]));
  const points: StorePoint[] = [];
  for (const s of stores) {
    // Postgres numeric is serialized as string by the pg driver — accept both.
    const lat = s.lat == null ? NaN : Number(s.lat);
    const lng = s.lng == null ? NaN : Number(s.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    points.push({
      id: s.id,
      name: s.displayName,
      chain: s.chain,
      lat,
      lng,
      color: s.zoneId ? zoneColorById.get(s.zoneId) ?? "#1F2937" : "#9CA3AF",
    });
  }
  return points;
}

function createStoreMarkerEl(point: StorePoint): HTMLElement {
  // Two-element layout: the outer wrapper is what Mapbox positions on every
  // frame (do NOT add transitions here or the icon visibly lags behind the
  // map while panning). The inner pill is what we recolor + scale on hover.
  const wrapper = document.createElement("div");
  wrapper.className = "loreal-store-marker";
  wrapper.style.cssText = "width: 28px; height: 28px; cursor: pointer;";

  const pill = document.createElement("div");
  pill.style.cssText = [
    "width: 100%",
    "height: 100%",
    "border-radius: 9999px",
    `background-color: ${point.color}`,
    "color: #FFFFFF",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "box-shadow: 0 1px 3px rgba(0,0,0,0.25), 0 0 0 2px #FFFFFF",
    "transition: transform 120ms ease",
  ].join(";");
  pill.innerHTML = STORE_ICON_SVG;
  const svg = pill.querySelector("svg");
  if (svg) {
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
  }

  wrapper.appendChild(pill);
  wrapper.addEventListener("mouseenter", () => {
    pill.style.transform = "scale(1.12)";
  });
  wrapper.addEventListener("mouseleave", () => {
    pill.style.transform = "scale(1)";
  });
  return wrapper;
}

// ── Component ──────────────────────────────────────────────────────

export function ZonesMap({
  zones,
  stores,
  selectedMunicipalityIds = [],
  onMunicipalitySelectionChange,
  selectionColor = "#D4AF37",
  focusedZoneId = null,
  className,
  initialCenter = [-102, 23.5],
  initialZoom = 4.5,
}: ZonesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, mapboxgl.Marker>>(
    new globalThis.Map(),
  );
  // Re-renders dependent effects when the map style finishes loading, so
  // setData on freshly-resolved queries actually runs instead of being lost.
  const [mapReady, setMapReady] = useState(false);
  const token = getMapboxToken();

  // Keep latest values reachable from event handlers without re-binding them.
  const selectedRef = useRef(selectedMunicipalityIds);
  const onSelectRef = useRef(onMunicipalitySelectionChange);
  selectedRef.current = selectedMunicipalityIds;
  onSelectRef.current = onMunicipalitySelectionChange;

  const { data: boundaries } = useMunicipalityBoundaries(undefined, 0.0005);

  // ── Map init ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "top-right",
    );
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {

      // Sources are added empty; setData populates them once queries resolve.
      map.addSource("municipalities", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection,
        promoteId: "id",
      });

      map.addLayer({
        id: "muni-fill",
        type: "fill",
        source: "municipalities",
        paint: {
          "fill-color": FALLBACK_COLOR,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.55,
            0.32,
          ],
        },
      });

      map.addLayer({
        id: "muni-line",
        type: "line",
        source: "municipalities",
        paint: {
          "line-color": "#1F2937",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1.4,
            0.5,
          ],
          "line-opacity": 0.4,
        },
      });

      // Hover state on municipalities
      let hoveredId: string | number | null = null;
      map.on("mousemove", "muni-fill", (e) => {
        if (!e.features?.length) return;
        const id = e.features[0].id ?? e.features[0].properties?.id;
        if (id === undefined || id === null) return;
        if (hoveredId !== null && hoveredId !== id) {
          map.setFeatureState({ source: "municipalities", id: hoveredId }, { hover: false });
        }
        hoveredId = id;
        map.setFeatureState({ source: "municipalities", id }, { hover: true });
        map.getCanvas().style.cursor = onSelectRef.current ? "pointer" : "";
      });
      map.on("mouseleave", "muni-fill", () => {
        if (hoveredId !== null) {
          map.setFeatureState({ source: "municipalities", id: hoveredId }, { hover: false });
          hoveredId = null;
        }
        map.getCanvas().style.cursor = "";
      });

      // Click to toggle municipality selection (only if handler provided)
      map.on("click", "muni-fill", (e) => {
        const onSelect = onSelectRef.current;
        if (!onSelect || !e.features?.length) return;
        const id = e.features[0].properties?.id as string | undefined;
        if (!id) return;
        const current = selectedRef.current;
        const next = current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id];
        onSelect(next);
      });

      // Mark ready last so dependent effects below run after sources/layers exist.
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Update sources when data changes ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !boundaries) return;
    const src = map.getSource("municipalities") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(boundaries as unknown as GeoJSON.FeatureCollection);
  }, [boundaries, mapReady]);

  // ── Render store markers as HTML elements ────────────────────────
  // We use Marker (not a circle layer) so each pin can carry an inline SVG
  // icon. The map of existing markers is kept in a ref so we can diff against
  // the next render — adding new stores, updating colors in place, and
  // removing markers whose stores no longer exist.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const points = buildStorePoints(stores, zones);
    const nextIds = new Set(points.map((p) => p.id));
    const markers = markersRef.current;

    // Remove markers whose stores disappeared.
    for (const [id, marker] of markers) {
      if (!nextIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }

    // Add/update markers for current stores.
    for (const point of points) {
      const existing = markers.get(point.id);
      if (existing) {
        existing.setLngLat([point.lng, point.lat]);
        const pill = existing.getElement().firstElementChild as HTMLElement | null;
        if (pill) pill.style.backgroundColor = point.color;
        continue;
      }
      const el = createStoreMarkerEl(point);
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
      }).setHTML(
        `<div style="font-family: inherit; font-size: 12px; padding: 4px 6px;">
          <div style="font-weight: 500;">${point.name}</div>
          <div style="color: #6B7280; text-transform: capitalize;">${point.chain}</div>
        </div>`,
      );
      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      el.addEventListener("mouseenter", () => {
        popup.setLngLat([point.lng, point.lat]).addTo(map);
      });
      el.addEventListener("mouseleave", () => {
        popup.remove();
      });
      markers.set(point.id, marker);
    }
  }, [stores, zones, mapReady]);

  // ── Update fill color (zones / selection / focus) ───────────────
  const fillExpression = useMemo(
    () => buildMunicipalityFillColor(zones, selectedMunicipalityIds, selectionColor),
    [zones, selectedMunicipalityIds, selectionColor],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setPaintProperty("muni-fill", "fill-color", fillExpression);
  }, [fillExpression, mapReady]);

  // Focus dimming
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!focusedZoneId) {
      map.setPaintProperty("muni-fill", "fill-opacity", [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.55,
        0.32,
      ]);
      return;
    }
    const zone = zones.find((z) => z.id === focusedZoneId);
    if (!zone) return;
    map.setPaintProperty("muni-fill", "fill-opacity", [
      "case",
      ["in", ["get", "id"], ["literal", zone.municipalityIds]],
      0.65,
      0.08,
    ] as unknown as mapboxgl.ExpressionSpecification);
  }, [focusedZoneId, zones, mapReady]);

  // ── Render fallback if no token ──────────────────────────────────
  if (!token) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground",
          className,
        )}
      >
        Configura <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> para ver el mapa.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full w-full overflow-hidden rounded-2xl ring-1 ring-foreground/6 shadow-sm",
        className,
      )}
    />
  );
}
