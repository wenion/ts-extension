import { UserEventTrace } from "../shared/types";
import { fetchJson, HttpError } from "./fetch";

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
  try {
    return await fetchJson<{ ids: string[] } | undefined>("/api/v1/traces/batch", {
      method: "POST",
      body: traces,
      token,
    });
  } catch (e : any) {
    if (e instanceof HttpError) {
      chrome.runtime.sendMessage({
        type: "HTTP_ERROR",
        error: {
          name: e.name,
          message: e.message,
          status: e.status,
          data: e.data,
          stack: e.stack, // optional (can remove in prod)
        }
      });
    }
    else if (e instanceof TypeError) {
      // likely a network error
    }
    else if (e instanceof SyntaxError) {
      // bad JSON
      console.log("Invalid JSON:", e.message);
    } else {
      // unknown
      console.log("Unknown error:", e);
    }

    throw e; // rethrow so that caller can handle retries
  }
}
