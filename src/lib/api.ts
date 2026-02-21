const API_URL = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return body as T;
}

/**
 * Typed HTTP client. All frontend data fetching goes through this object.
 * In dev, Vite proxies `/api` to the Express backend (see vite.config.ts).
 * Errors are thrown as `Error` — handle in mutation `onError` or try/catch.
 */
export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),

  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
};
