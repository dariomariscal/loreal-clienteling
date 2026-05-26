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
  const [mapError, setMapError] = useState<string | null>(null);
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
  // Mapbox renders a blank canvas if instantiated against a 0×0 container,
  // and its internal `load` event never fires — leaving the map permanently
  // stuck. In a flex/route-transition layout the container often takes one
  // animation frame to reach its real size, so we wait for that before
  // calling `new mapboxgl.Map`. See mapbox-gl-js#8982 for the canonical
  // pattern: rAF until offsetWidth/Height > 0, then trackResize handles
  // every subsequent layout change.
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    let cancelled = false;
    let rafId: number | null = null;
    let map: mapboxgl.Map | null = null;
    const cleanupFns: Array<() => void> = [];

    const start = () => {
      const el = containerRef.current;
      if (cancelled || !el) return;
      if (el.offsetWidth === 0 || el.offsetHeight === 0) {
        rafId = requestAnimationFrame(start);
        return;
      }

      mapboxgl.accessToken = token;
      try {
        map = new mapboxgl.Map({
          container: el,
          style: "mapbox://styles/mapbox/light-v11",
          center: initialCenter,
          zoom: initialZoom,
          attributionControl: false,
          trackResize: true,
        });
      } catch (err) {
        setMapError(
          err instanceof Error ? err.message : "No se pudo inicializar Mapbox",
        );
        return;
      }

      map.on("error", (e) => {
        const msg = e?.error?.message ?? "Mapbox error";
        // eslint-disable-next-line no-console
        console.error("[CustomerDensityMap] mapbox error:", e);
        setMapError(msg);
      });

      map.addControl(
        new mapboxgl.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        }),
        "top-right",
      );
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      attachMapLayers(map);
      mapRef.current = map;
    };

    const attachMapLayers = (m: mapboxgl.Map) => {
      m.on("load", () => {
        m.addSource("density", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection,
          promoteId: "id",
        });

        m.addLayer({
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

        m.addLayer({
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
        m.on("mousemove", "density-fill", (e) => {
          if (!e.features?.length) return;
          const id = e.features[0].id ?? e.features[0].properties?.id;
          if (id === undefined || id === null) return;
          if (hoveredId !== null && hoveredId !== id) {
            m.setFeatureState({ source: "density", id: hoveredId }, { hover: false });
          }
          hoveredId = id;
          m.setFeatureState({ source: "density", id }, { hover: true });
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", "density-fill", () => {
          if (hoveredId !== null) {
            m.setFeatureState({ source: "density", id: hoveredId }, { hover: false });
            hoveredId = null;
          }
          m.getCanvas().style.cursor = "";
        });

        m.on("click", "density-fill", (e) => {
          const onClick = onClickRef.current;
          if (!onClick || !e.features?.length) return;
          const f = e.features[0];
          onClick({
            municipalityId: String(f.properties?.id ?? f.id ?? ""),
            municipalityName: String(f.properties?.name ?? ""),
            customerCount: Number(f.properties?.customerCount ?? 0),
          });
        });

        // Belt-and-suspenders: resize once layers are in, in case the
        // container grew between init and load.
        m.resize();
        setMapReady(true);
      });
    };

    start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      for (const fn of cleanupFns) fn();
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      if (map) {
        map.remove();
      }
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

    // Frame the viewport on the data the first time it arrives, otherwise a
    // user whose territory sits far from the default center sees a blank
    // canvas with the polygons offscreen.
    if (data.features.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      let added = 0;

      const extendRing = (ring: unknown) => {
        if (!Array.isArray(ring)) return;
        for (const pt of ring) {
          if (!Array.isArray(pt) || pt.length < 2) continue;
          const lng = Number(pt[0]);
          const lat = Number(pt[1]);
          if (Number.isFinite(lng) && Number.isFinite(lat)) {
            bounds.extend([lng, lat]);
            added++;
          }
        }
      };

      for (const f of data.features) {
        const geom = f.geometry as
          | { type: string; coordinates: unknown }
          | undefined;
        if (!geom || !Array.isArray(geom.coordinates)) continue;

        if (geom.type === "MultiPolygon") {
          for (const poly of geom.coordinates as unknown[]) {
            if (!Array.isArray(poly)) continue;
            for (const ring of poly) extendRing(ring);
          }
        } else if (geom.type === "Polygon") {
          for (const ring of geom.coordinates as unknown[]) extendRing(ring);
        }
      }
      if (added > 0) {
        map.fitBounds(bounds, {
          padding: { top: 32, bottom: 32, left: 320, right: 32 },
          duration: 0,
          maxZoom: 12,
        });
      }
    }
  }, [data, mapReady]);

  // ── Keep canvas in sync with the container size ──────────────────
  // Mapbox computes its WebGL viewport once on init; in a flex/route-
  // transition layout the container often gains its final size *after*
  // that, leaving the map rendered at 0×0 (i.e. "blank"). Observe and
  // call resize() to recover.
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !mapReady || !el) return;
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);
    map.resize();
    return () => ro.disconnect();
  }, [mapReady]);

  // ── Apply choropleth color expression ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Mapbox "step" requires strictly ascending stops. When the data is sparse
    // or clustered (e.g. most municipalities share the same low count), the
    // quintiles can collapse into duplicates like [1,1,1,2,5] — which crashes
    // the style. Dedupe stops and drop the palette colors that lose their slot.
    const stops: number[] = [];
    const outs: string[] = [PALETTE[0]];
    for (let i = 0; i < 4; i++) {
      const next = breaks[i];
      if (next > (stops[stops.length - 1] ?? 0)) {
        stops.push(next);
        outs.push(PALETTE[i + 1]);
      }
    }

    const stepExpr: mapboxgl.ExpressionSpecification =
      stops.length === 0
        ? (outs[0] as unknown as mapboxgl.ExpressionSpecification)
        : ([
            "step",
            ["get", "customerCount"],
            ...outs.flatMap((color, i) =>
              i === 0 ? [color] : [stops[i - 1], color],
            ),
          ] as mapboxgl.ExpressionSpecification);

    const expr: mapboxgl.ExpressionSpecification = [
      "case",
      ["==", ["get", "customerCount"], 0],
      NO_DATA_COLOR,
      stepExpr,
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

  // Match the ZonesMap pattern: the div carrying the ref *is* the sized
  // element. Wrapping it in another div and using `absolute inset-0` is
  // what was leaving Mapbox with a 0×0 container in a flex chain (the
  // ZonesMap parent uses an explicit `h-[640px]`; we use flex). Here we
  // make the wrapper a column flex so the container claims all remaining
  // space without depending on `h-full` measuring correctly on first paint.
  return (
    <div className={cn("relative flex h-full w-full flex-col", className)}>
      <div ref={containerRef} className="relative min-h-0 flex-1" />
      {mapError ? (
        <div className="pointer-events-none absolute top-4 right-4 max-w-sm rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive shadow-sm">
          <p className="font-semibold">Error de Mapbox</p>
          <p className="mt-0.5 break-words">{mapError}</p>
        </div>
      ) : null}
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
