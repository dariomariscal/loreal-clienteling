import { useEffect, useState } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const SEARCH_URL = "https://api.mapbox.com/search/searchbox/v1/suggest";
const RETRIEVE_URL = "https://api.mapbox.com/search/searchbox/v1/retrieve";

export interface GeocodingSuggestion {
  mapboxId: string;
  name: string;
  placeFormatted: string;
}

export interface GeocodingResult {
  address: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
}

/**
 * Mapbox Search Box: address autocomplete debounced by 250ms.
 * Returns suggestions filtered to Mexico.
 */
export function useAddressSuggestions(query: string, sessionToken: string) {
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!MAPBOX_TOKEN || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          access_token: MAPBOX_TOKEN,
          session_token: sessionToken,
          country: "mx",
          language: "es",
          limit: "5",
          types: "address,poi,place",
        });
        const res = await fetch(`${SEARCH_URL}?${params}`);
        if (!res.ok) throw new Error("Mapbox suggest failed");
        const data = await res.json();
        setSuggestions(
          (data.suggestions ?? []).map((s: { mapbox_id: string; name: string; place_formatted: string }) => ({
            mapboxId: s.mapbox_id,
            name: s.name,
            placeFormatted: s.place_formatted,
          })),
        );
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, sessionToken]);

  return { suggestions, isLoading };
}

/**
 * Retrieves full address details + coordinates for a selected suggestion.
 */
export async function retrieveAddress(
  mapboxId: string,
  sessionToken: string,
): Promise<GeocodingResult | null> {
  if (!MAPBOX_TOKEN) return null;

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    session_token: sessionToken,
  });
  const res = await fetch(`${RETRIEVE_URL}/${mapboxId}?${params}`);
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const [lng, lat] = feature.geometry.coordinates;
  const props = feature.properties ?? {};
  const ctx = props.context ?? {};

  return {
    address: props.full_address ?? props.place_formatted ?? props.name ?? "",
    city: ctx.place?.name ?? ctx.locality?.name,
    state: ctx.region?.name,
    country: ctx.country?.name,
    lat,
    lng,
  };
}

export function getMapboxToken(): string | undefined {
  return MAPBOX_TOKEN;
}
