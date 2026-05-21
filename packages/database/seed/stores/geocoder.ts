const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT =
  "loreal-clienteling-seed (https://github.com/loreal/clienteling)";

export interface GeocodeResult {
  lat: number;
  lng: number;
}

export async function geocode(query: string): Promise<GeocodeResult> {
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=mx&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT, "Accept-Language": "es" },
  });
  if (!res.ok) {
    throw new Error(`Nominatim ${res.status} ${res.statusText} for "${query}"`);
  }
  const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (rows.length === 0) {
    throw new Error(`Nominatim returned no result for "${query}"`);
  }
  return { lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
