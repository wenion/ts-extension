
type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

interface AuthedFetchOptions extends Omit<RequestInit, "body"> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: QueryParams;
  body?: unknown; // JSON body by default
  rawBody?: BodyInit; // if you want full control
  baseUrl?: string; // optional override
}

export async function fetchJson<T = any>(
  path: string,
  options: Omit<AuthedFetchOptions, "token"> & { token?: string } = {}
): Promise<T> {
  const {
    method = "GET",
    query,
    body,
    rawBody,
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL!,
    headers,
    token,
    ...rest
  } = options;

  const url = new URL(path, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }

  const finalHeaders: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body && !rawBody ? { "Content-Type": "application/json" } : {}),
    ...(headers ?? {}),
  };

  const res = await fetch(url.toString(), {
    method,
    headers: finalHeaders,
    body: rawBody ?? (body ? JSON.stringify(body) : undefined),
    ...rest,
  });
  // caller decides how to handle 401 if it wants
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text}`);
  }

  // handle empty responses
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}
