import { TraceRecord } from "../shared/types";
import { fetchJson } from "./fetch";

export const insertTrace = async (
  trace: TraceRecord,
  token?: string,
  onError?: (response: Response) => void | Promise<void>,
): Promise<{ id: string } | undefined> => {
  return fetchJson<{ id: string } | undefined>("/api/traces", {
    method: "POST",
    body: trace,
    token,
    onError,
  });
}
