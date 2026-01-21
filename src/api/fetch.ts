export class HttpError<T = unknown> extends Error {
  readonly status: number;
  readonly data?: T;

  constructor(status: number, data?: T, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

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
): Promise<T | undefined> {
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
    const data = await res.json().catch(() => undefined);
    throw new HttpError(res.status, data, data?.error ?? `HTTP ${res.status}`);
  }

  // handle empty responses
  if (res.status === 204) return undefined;

  return (await res.json()) as T;
}
