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
  /** Initial center; defaults to CDMX. */
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

function storesFeatureCollection(stores: Store[], zones: Zone[]) {
  const zoneColorById = new Map(zones.map((z) => [z.id, z.color]));
  return {
    type: "FeatureCollection" as const,
    features: stores
      .map((s) => {
        // Postgres numeric is serialized as string by the pg driver — accept both.
        const lat = s.lat == null ? NaN : Number(s.lat);
        const lng = s.lng == null ? NaN : Number(s.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat],
          },
          properties: {
            id: s.id,
            name: s.displayName,
            chain: s.chain,
            zoneColor: s.zoneId ? zoneColorById.get(s.zoneId) ?? "#1F2937" : "#9CA3AF",
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null),
  };
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
  initialCenter = [-99.1332, 19.4326],
  initialZoom = 9,
}: ZonesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
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

      map.addSource("stores", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection,
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

      map.addLayer({
        id: "stores-pins",
        type: "circle",
        source: "stores",
        paint: {
          "circle-radius": 7,
          "circle-color": ["get", "zoneColor"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
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

      // Click on store pin → popup
      map.on("click", "stores-pins", (e) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        const props = f.properties ?? {};
        new mapboxgl.Popup({ closeButton: false, offset: 12 })
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<div style="font-family: inherit; font-size: 12px; padding: 4px 6px;">
              <div style="font-weight: 500;">${props.name ?? ""}</div>
              <div style="color: #6B7280; text-transform: capitalize;">${props.chain ?? ""}</div>
            </div>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", "stores-pins", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "stores-pins", () => {
        map.getCanvas().style.cursor = "";
      });

      // Mark ready last so dependent effects below run after sources/layers exist.
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("stores") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(storesFeatureCollection(stores, zones) as unknown as GeoJSON.FeatureCollection);
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
        "h-full w-full overflow-hidden rounded-2xl ring-1 ring-foreground/[0.06] shadow-sm",
        className,
      )}
    />
  );
}
