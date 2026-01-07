import {
  attachXHR,
  detachXHR,
  injectPageScript
} from "./xhrHookController";

import {
  XHRHookConfig,
} from "./xhrHookMessageProtocol";

type GoogleDocsEventTraceBase = {
  endpoint: string;
  url: string;
  type: string;
  eventValue: string;
  eventState?: string;
  eventId: string;
  eventTime: string;
  startPosition?: number;
  endPosition?: number;
}

let googleDocsMessageHandler: ((event: MessageEvent) => void) | null = null;

function postMessageToContentScript(data: GoogleDocsEventTraceBase) {
  chrome.runtime.sendMessage(data);
}

export const googleDocsHandler = (
) => {
  return (event: MessageEvent) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== "injected") return;

    const meta = msg.meta;

    if (meta.url.includes("/save")) {
      const decoded = decodeURIComponent(msg.body);
      const params = new URLSearchParams(decoded);
      const bundlesRaw = params.get("bundles");
      if (!bundlesRaw) return;
      const bundles = JSON.parse(bundlesRaw);

      try {
        const content = bundles[0].commands[0];
        const type = content.ty;

        if (type === "is") {
          const ibi = content.ibi;
          const text = content.s;
          const data: GoogleDocsEventTraceBase = {
            endpoint: "save",
            url: window.location.href,
            type: type,
            eventValue: text,
            eventId: meta.requestId,
            eventTime: new Date().toISOString(),
            startPosition: ibi,
          }
          postMessageToContentScript(data);
        }
        else if (type === "ds") {
          const si = content.si;
          const ei = content.ei;
          const data: GoogleDocsEventTraceBase = {
            endpoint: "save",
            url: window.location.href,
            type: type,
            eventValue: "",
            eventId: meta.requestId,
            eventTime: new Date().toISOString(),
            startPosition: si,
            endPosition: ei,
          }
          postMessageToContentScript(data);
        }
        else if (type === "mlti") {
          const mts = content.mts as Array<{ty: string; ibi?: number; s?: string; si?: number; ei?: number;}>;
          mts.forEach(item => {
            if (item.ty === "is") {
              const ibi = item.ibi;
              const text = item.s;
              const data: GoogleDocsEventTraceBase = {
                endpoint: "save",
                url: window.location.href,
                type: type,
                eventValue: text?? "",
                eventId: meta.requestId,
                eventTime: new Date().toISOString(),
                startPosition: ibi,
              }
              postMessageToContentScript(data);
            }
            else if (item.ty === "ds") {
              const si = item.si;
              const ei = item.ei;
              const data: GoogleDocsEventTraceBase = {
                endpoint: "save",
                url: window.location.href,
                type: type,
                eventValue: "",
                eventId: meta.requestId,
                eventTime: new Date().toISOString(),
                startPosition: si,
                endPosition: ei,
              }
              postMessageToContentScript(data);
            }
          });
        }
        else {
          console.log("unknown type:", type);
        }
      } catch (e) {
        console.log("bundles exception:", e);
      }

    }
    else if (meta.url.includes("/assistwriting")) {
      try {
        const body = JSON.parse(msg.body);
        const suggestionText = body[0][0];

        const data: GoogleDocsEventTraceBase = {
          endpoint: "assistwriting",
          url: window.location.href,
          type: "assistwriting",
          eventState: suggestionText,
          eventValue: body.prompt ?? "",
          eventId: meta.requestId,
          eventTime: new Date().toISOString(),
        }
        postMessageToContentScript(data);
      } catch (e) {
        console.log("assistwriting exception:", e);
      }
    }
  };

}

export const addGoogleDocsEventListener = (
  config : XHRHookConfig,
  handler: (event: MessageEvent) => void,
) => {
  if (googleDocsMessageHandler) return;

  googleDocsMessageHandler = handler;

  const onLoad = () => attachXHR(config);
  injectPageScript(onLoad);

  window.addEventListener("message", googleDocsMessageHandler);
}

export const removeGoogleDocsEventListener = () => {
  if (!googleDocsMessageHandler) return;

  detachXHR();
  window.removeEventListener("message", googleDocsMessageHandler);
  googleDocsMessageHandler = null;
}
