import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Zone } from "./use-zones";

export interface Municipality {
  id: string;
  stateCode: string;
  stateName: string;
  name: string;
}

const geoKeys = {
  municipalities: (stateCode?: string) =>
    stateCode ? (["geo", "municipalities", stateCode] as const) : (["geo", "municipalities"] as const),
  zoneByPoint: (lat?: number, lng?: number) => ["geo", "zone-by-point", lat, lng] as const,
};

/** Static reference list. Used for displaying names and grouping in the zones page. */
export function useMunicipalities(stateCode?: string) {
  return useQuery({
    queryKey: geoKeys.municipalities(stateCode),
    queryFn: () => {
      const qs = stateCode ? `?stateCode=${stateCode}` : "";
      return api.get<Municipality[]>(`/geo/municipalities${qs}`);
    },
    staleTime: 1000 * 60 * 60, // 1h — municipalities don't change
  });
}

/** Resolve the zone (if any) that contains a given lat/lng. Used by store form. */
export function useZoneByPoint(lat: number | undefined, lng: number | undefined) {
  return useQuery({
    queryKey: geoKeys.zoneByPoint(lat, lng),
    queryFn: () => api.get<Zone | null>(`/zones/by-point?lat=${lat}&lng=${lng}`),
    enabled: typeof lat === "number" && typeof lng === "number",
  });
}

export interface BoundariesFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
    properties: {
      id: string;
      name: string;
      stateCode: string;
      stateName: string;
    };
  }>;
}

/**
 * Municipality polygons as a GeoJSON FeatureCollection. Heavy payload — keep
 * a long staleTime since these are static reference data.
 */
export function useMunicipalityBoundaries(stateCode?: string, simplify?: number) {
  return useQuery({
    queryKey: ["geo", "municipality-boundaries", stateCode, simplify] as const,
    queryFn: () => {
      const params = new URLSearchParams();
      if (stateCode) params.set("stateCode", stateCode);
      if (simplify) params.set("simplify", String(simplify));
      const qs = params.toString();
      return api.get<BoundariesFeatureCollection>(
        `/geo/municipalities/boundaries${qs ? `?${qs}` : ""}`,
      );
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

// ── Customer density (Area Manager / National Retail Manager) ──────

export interface CustomerDensityRow {
  municipalityId: string;
  municipalityName: string;
  stateCode: string;
  stateName: string;
  customerCount: number;
}

export interface CustomerDensityFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
    properties: {
      id: string;
      name: string;
      stateCode: string;
      stateName: string;
      customerCount: number;
    };
  }>;
}

/**
 * Customer density per municipality, scoped to the caller's accessible
 * stores. When `geojson=false` (default) returns a flat list; with
 * `geojson=true` returns a FeatureCollection ready for choropleth rendering.
 */
export function useCustomerDensity<
  G extends boolean = false,
>(options: { geojson?: G; simplify?: number } = {}) {
  type Result = G extends true
    ? CustomerDensityFeatureCollection
    : { data: CustomerDensityRow[] };

  return useQuery({
    queryKey: ["geo", "customer-density", options] as const,
    queryFn: () => {
      const params: Record<string, string> = {};
      if (options.geojson) params.geojson = "true";
      if (options.simplify) params.simplify = String(options.simplify);
      return api.get<Result>(
        "/geo/customer-density",
        Object.keys(params).length ? params : undefined,
      );
    },
    // Density rolls up customer signups which barely move minute-to-minute;
    // a few minutes of cache keeps the heatmap responsive without spamming.
    staleTime: 1000 * 60 * 5,
  });
}
