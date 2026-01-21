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
