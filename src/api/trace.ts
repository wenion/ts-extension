import { TraceRecord } from "../shared/types";
import { fetchJson } from "./fetch";

export const insertTrace = async (
  trace: TraceRecord,
  token?: string
): Promise<{ id: string }> => {
  return fetchJson<{ id: string }>("/api/trace", {
    method: "POST",
    body: trace,
    token,
  });
}
