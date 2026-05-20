import { auth } from "@clerk/nextjs/server";
import { API_URL } from "./constants";
import { ApiError } from "./api-client";

/**
 * Server-side fetch wrapper. Use from Server Components, Route Handlers and
 * Server Actions. The client-side counterpart lives in `api-client.ts` and is
 * wired up by `<ApiTokenSync />` so React Query hooks share the same shape.
 */
export async function apiFetchServer<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();

  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, res.statusText, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
