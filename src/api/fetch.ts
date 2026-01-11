
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

  /** called for any !res.ok (including 401 if you want) */
  onError?: (response: Response) => void | Promise<void>;
}

export async function fetchJson<T = any>(
  path: string,
  options: Omit<AuthedFetchOptions, "token"> & { token?: string } = {}
): Promise<T | undefined> {
  const {
    method = "GET",
    query,
    body,
    rawBody,
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL!,
    headers,
    token,
    onError,
    ...rest
  } = options;

  const url = new URL(path, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
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

  if (!res.ok) {
    if (onError) {
      await onError(res);
      return undefined;
    }

    const text = await res.text().catch(() => "");
    throw new Error(
      `Request failed (${res.status}): ${text || res.statusText}`
    );
  }

  // handle empty responses
  if (res.status === 204) return undefined;

  return (await res.json()) as T;
}
