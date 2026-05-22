import { API_URL } from "./constants";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`${status} ${statusText}`);
    this.name = "ApiError";
  }
}

// ── Token resolver ────────────────────────────────────────────────
// `<ApiTokenSync />` (mounted in the root layout) calls `setTokenResolver`
// with a function that wraps Clerk's `useAuth().getToken()`. The api singleton
// awaits it on every request so React Query hooks (which can't await the
// useAuth hook inline) keep working with the same `api.get/post/...` shape.

type TokenResolver = () => Promise<string | null>;

let tokenResolver: TokenResolver | null = null;

export function setTokenResolver(resolver: TokenResolver | null): void {
  tokenResolver = resolver;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!tokenResolver) return {};
  const token = await tokenResolver();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Typed fetch ───────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const authHeader = await getAuthHeader();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, res.statusText, body);
  }

  if (res.status === 204) return undefined as T;
  // Tolerate empty body (some endpoints return null with no payload).
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// ── Convenience methods ────────────────────────────────────────────

export const api = {
  get<T>(path: string, params?: Record<string, string>) {
    const query = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return apiFetch<T>(`${path}${query}`);
  },

  post<T>(path: string, body: unknown) {
    return apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown) {
    return apiFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown) {
    return apiFetch<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string, body?: unknown) {
    return apiFetch<T>(path, {
      method: "DELETE",
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  },
};
