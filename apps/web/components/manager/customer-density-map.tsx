"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { cn } from "@/lib/utils";
import { getMapboxToken } from "@/lib/hooks/use-geocoding";
import type { CustomerDensityFeatureCollection } from "@/lib/hooks/use-geo";
import type { Store } from "@/lib/hooks/use-stores";

interface Selection {
  municipalityId: string;
  municipalityName: string;
  customerCount: number;
}

interface CustomerDensityMapProps {
  /** GeoJSON FeatureCollection with customerCount per feature. */
  data: CustomerDensityFeatureCollection | null | undefined;
  /** Stores to render as pins on top of the choropleth. */
  stores: Store[];
  onMunicipalityClick?: (selection: Selection) => void;
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const NO_DATA_COLOR = "#F3F4F6";

/**
 * Computes a sequential color expression for the choropleth.
 *
 * CARTO best practice: 5 classes max, sequential palette, transition based
 * on percentiles of the *visible* data so the legend stays meaningful at any
 * zoom level. Counts are normalized into 5 buckets by Jenks-like quintiles
 * (computed client-side from the feature set we receive).
 */
function computeBreaks(counts: number[]): number[] {
  if (counts.length === 0) return [1, 2, 4, 8, 16];
  const sorted = [...counts].sort((a, b) => a - b);
  // Quintile thresholds.
  return [
    sorted[Math.floor(sorted.length * 0.2)] || 1,
    sorted[Math.floor(sorted.length * 0.4)] || 1,
    sorted[Math.floor(sorted.length * 0.6)] || 1,
    sorted[Math.floor(sorted.length * 0.8)] || 1,
    sorted[sorted.length - 1] || 1,
  ];
}

const PALETTE: readonly string[] = [
  // L'Oréal accent (rose/gold tones) graduated from pale to saturated.
  "#FCEEDB",
  "#F4D6A8",
  "#E8B074",
  "#D4884A",
  "#B05E25",
];

export function CustomerDensityMap({
  data,
  stores,
  onMunicipalityClick,
  className,
  initialCenter = [-99.13, 19.43], // CDMX
  initialZoom = 9.3,
}: CustomerDensityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, mapboxgl.Marker>>(
    new globalThis.Map(),
  );
  const [mapReady, setMapReady] = useState(false);
  const token = getMapboxToken();

  const onClickRef = useRef(onMunicipalityClick);
  onClickRef.current = onMunicipalityClick;

  const breaks = useMemo(() => {
    if (!data) return [1, 2, 4, 8, 16];
    const counts = data.features
      .map((f) => f.properties.customerCount)
      .filter((c) => c > 0);
    return computeBreaks(counts);
  }, [data]);

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
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    map.on("load", () => {
      map.addSource("density", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection,
        promoteId: "id",
      });

      map.addLayer({
        id: "density-fill",
        type: "fill",
        source: "density",
        paint: {
          "fill-color": NO_DATA_COLOR,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.85,
            0.65,
          ],
        },
      });

      map.addLayer({
        id: "density-line",
        type: "line",
        source: "density",
        paint: {
          "line-color": "#1F2937",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1.6,
            0.4,
          ],
          "line-opacity": 0.4,
        },
      });

      let hoveredId: string | number | null = null;
      map.on("mousemove", "density-fill", (e) => {
        if (!e.features?.length) return;
        const id = e.features[0].id ?? e.features[0].properties?.id;
        if (id === undefined || id === null) return;
        if (hoveredId !== null && hoveredId !== id) {
          map.setFeatureState({ source: "density", id: hoveredId }, { hover: false });
        }
        hoveredId = id;
        map.setFeatureState({ source: "density", id }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "density-fill", () => {
        if (hoveredId !== null) {
          map.setFeatureState({ source: "density", id: hoveredId }, { hover: false });
          hoveredId = null;
        }
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "density-fill", (e) => {
        const onClick = onClickRef.current;
        if (!onClick || !e.features?.length) return;
        const f = e.features[0];
        onClick({
          municipalityId: String(f.properties?.id ?? f.id ?? ""),
          municipalityName: String(f.properties?.name ?? ""),
          customerCount: Number(f.properties?.customerCount ?? 0),
        });
      });

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

  // ── Update density source ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !data) return;
    const src = map.getSource("density") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(data as unknown as GeoJSON.FeatureCollection);
  }, [data, mapReady]);

  // ── Apply choropleth color expression ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    // Step expression: 0 → NO_DATA_COLOR, then each quintile picks the next
    // palette stop. Counts are read from feature properties.
    const expr: mapboxgl.ExpressionSpecification = [
      "case",
      ["==", ["get", "customerCount"], 0],
      NO_DATA_COLOR,
      [
        "step",
        ["get", "customerCount"],
        PALETTE[0],
        breaks[0],
        PALETTE[1],
        breaks[1],
        PALETTE[2],
        breaks[2],
        PALETTE[3],
        breaks[3],
        PALETTE[4],
      ],
    ];
    map.setPaintProperty("density-fill", "fill-color", expr);
  }, [breaks, mapReady]);

  // ── Store pins ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const points = stores
      .map((s) => ({
        id: s.id,
        name: s.displayName,
        banner: s.banner,
        lat: s.lat == null ? NaN : Number(s.lat),
        lng: s.lng == null ? NaN : Number(s.lng),
      }))
      .filter((p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));

    const nextIds = new Set(points.map((p) => p.id));
    const markers = markersRef.current;
    for (const [id, marker] of markers) {
      if (!nextIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
    for (const point of points) {
      const existing = markers.get(point.id);
      if (existing) {
        existing.setLngLat([point.lng, point.lat]);
        continue;
      }
      const el = document.createElement("div");
      el.style.cssText = [
        "width: 14px",
        "height: 14px",
        "border-radius: 9999px",
        "background-color: #1F2937",
        "box-shadow: 0 0 0 3px rgba(255,255,255,0.95), 0 1px 3px rgba(0,0,0,0.3)",
        "cursor: pointer",
      ].join(";");
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
      }).setHTML(
        `<div style="font-family: inherit; font-size: 12px; padding: 4px 6px;">
          <div style="font-weight: 500;">${point.name}</div>
          <div style="color: #6B7280; text-transform: capitalize;">${point.banner}</div>
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
  }, [stores, mapReady]);

  if (!token) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/20 text-sm text-muted-foreground",
          className,
        )}
      >
        Configura <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> para ver el mapa.
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div ref={containerRef} className="absolute inset-0" />
      <DensityLegend breaks={breaks} />
    </div>
  );
}

function DensityLegend({ breaks }: { breaks: number[] }) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Densidad de clientas
      </p>
      <div className="flex items-center gap-1">
        {PALETTE.map((color, idx) => (
          <div key={color} className="flex flex-col items-start gap-0.5">
            <div
              aria-hidden
              className="h-3 w-8 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {idx === 0 ? "1" : `≤${breaks[idx]}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
