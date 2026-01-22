import {
  attachXHR,
  detachXHR,
  injectPageScript
} from "./xhrHookController";
import {
  XHRHookConfig,
} from "./xhrHookMessageProtocol";

import type { UserEventTrace } from "../shared/types";

let googleDocsMessageHandler: ((event: MessageEvent) => void) | null = null;

function postMessageToContentScript(data: UserEventTrace) {
  chrome.runtime.sendMessage({
    type: "UserEvent",
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
          const data: UserEventTrace = {
            tag: "POST",
            eventType: "keystroke",
            elementType: "insert",
            url: window.location.href,
            author: "human",
            sessionId: meta.requestId,
            eventValue: text,
            startPosition: ibi,
            timestamp: Date.now(),
            source: "API",
          }
          postMessageToContentScript(data);
        }
        else if (type === "ds") {
          const si = content.si;
          const ei = content.ei;
          const data: UserEventTrace = {
            tag: "POST",
            eventType: "keystroke",
            elementType: "delete",
            url: window.location.href,
            author: "human",
            sessionId: meta.requestId,
            timestamp: Date.now(),
            startPosition: si,
            endPosition: ei,
            source: "API",
          }
          postMessageToContentScript(data);
        }
        else if (type === "mlti") {
          const mts = content.mts as Array<{ty: string; ibi?: number; s?: string; si?: number; ei?: number;}>;
          mts.forEach(item => {
            if (item.ty === "is") {
              const ibi = item.ibi;
              const text = item.s;
              const data: UserEventTrace = {
                tag: "POST",
                eventType: "keystroke",
                elementType: "insert",
                url: window.location.href,
                author: "human",
                eventValue: text ?? "",
                sessionId: meta.requestId,
                timestamp: Date.now(),
                startPosition: ibi,
                source: "API",
              }
              postMessageToContentScript(data);
            }
            else if (item.ty === "ds") {
              const si = item.si;
              const ei = item.ei;
              const data: UserEventTrace = {
                tag: "POST",
                eventType: "keystroke",
                elementType: "delete",
                url: window.location.href,
                author: "human",
                eventValue: "",
                sessionId: meta.requestId,
                timestamp: Date.now(),
                startPosition: si,
                endPosition: ei,
                source: "API",
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

        const data: UserEventTrace = {
          tag: "POST",
          eventType: "input",
          elementType: "suggestion",
          url: window.location.href,
          author: "human",
          eventState: suggestionText,
          eventValue: body.prompt ?? null,
          sessionId: meta.requestId,
          timestamp: Date.now(),
          source: "API",
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
