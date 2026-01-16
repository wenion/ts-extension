import {
  attachXHR,
  detachXHR,
  injectPageScript
} from "./xhrHookController";
import {
  XHRHookConfig,
} from "./xhrHookMessageProtocol";

import type { ApiEventTrace } from "../shared/types";
import { MessageType, Source } from "../shared/types";

let googleDocsMessageHandler: ((event: MessageEvent) => void) | null = null;

function postMessageToContentScript(data: ApiEventTrace) {
  chrome.runtime.sendMessage({
    type: MessageType.ApiEvent,
    payload: data
  });
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
          const data: ApiEventTrace = {
            method: "POST",
            eventType: "keystroke",
            subType: "insert",
            url: window.location.href,
            pageType: "editor",
            author: "human",
            source: Source.GOOGLE_DOCS,
            eventId: meta.requestId,
            eventValue: text,
            startPosition: ibi,
            eventTime: new Date().toISOString(),
          }
          postMessageToContentScript(data);
        }
        else if (type === "ds") {
          const si = content.si;
          const ei = content.ei;
          const data: ApiEventTrace = {
            method: "POST",
            eventType: "keystroke",
            subType: "delete",
            url: window.location.href,
            pageType: "editor",
            author: "human",
            source: Source.GOOGLE_DOCS,
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
              const data: ApiEventTrace = {
                method: "POST",
                eventType: "keystroke",
                subType: "insert",
                url: window.location.href,
                pageType: "editor",
                author: "human",
                source: Source.GOOGLE_DOCS,
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
              const data: ApiEventTrace = {
                method: "POST",
                eventType: "keystroke",
                subType: "delete",
                url: window.location.href,
                pageType: "editor",
                author: "human",
                source: Source.GOOGLE_DOCS,
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

        const data: ApiEventTrace = {
          method: "POST",
          eventType: "input",
          subType: "change",
          source: Source.GOOGLE_DOCS,
          url: window.location.href,
          pageType: "editor",
          author: "human",
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
