import { UserEventTrace } from "../shared/types";
import { fetchJson } from "./fetch";

export const insertTrace = async (
  trace: UserEventTrace,
  token?: string,
): Promise<{ id: string } | undefined> => {
  return fetchJson<{ id: string } | undefined>("/api/v1/traces", {
    method: "POST",
    body: trace,
    token,
  });
}

export const insertTraces = async (
  traces: UserEventTrace[],
  token?: string,
): Promise<{ ids: string[] } | undefined> => {
  return fetchJson<{ ids: string[] } | undefined>("/api/v1/traces/batch", {
    method: "POST",
    body: traces,
    token,
  });
}
