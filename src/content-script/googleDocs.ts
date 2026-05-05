import {
  attachXHR,
  detachXHR,
  injectPageScript
} from "./xhrHookController";
import {
  XHRHookConfig,
} from "./xhrHookMessageProtocol";

import type { GoogleDocsMeta } from "../shared/types";

let googleDocsMessageHandler: ((event: MessageEvent) => void) | null = null;

function postMessageToContentScript(data: GoogleDocsMeta) {
  chrome.runtime.sendMessage({
    type: "GoogleDocsMeta",
    payload: data
  });
}

type DocElement = {
  ty: string; // "is" for insert, "ds" for delete, "mlti" for multi
  ibi?: number; // insert position for "is"
  s?: string; // inserted text for "is"
  si?: number; // start position for "ds"
  ei?: number; // end position for "ds"
  st?: string; // for "as" type, e.g., "ignore_spellcheck"
  mts?: Array<DocElement>; // array of operations for "mlti"
};

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

      const parseCommands = (command: DocElement, reqId: number, index: number) => {
        const type = command.ty;
        if (type === "is") {
          const ibi = command.ibi;
          const text = command.s;
          const data: GoogleDocsMeta = {
            api: "save",
            requestId: reqId,
            url: window.location.href,
            type: "insert",
            startPosition: ibi,
            timestamp: Date.now(),
            content: text,
            category: "is",
            index: index
          };
          postMessageToContentScript(data);
        }
        else if (type === "ds") {
          const si = command.si;
          const ei = command.ei;
          const data: GoogleDocsMeta = {
            api: "save",
            requestId: reqId,
            url: window.location.href,
            type: "delete",
            startPosition: si,
            endPosition: ei,
            timestamp: Date.now(),
            category: "ds",
            index: index
          }
          postMessageToContentScript(data);
        }
        else if (type === "mlti") {
          const mts = command.mts;
          if (mts) {
            mts.forEach((item, idx) => parseCommands(item, reqId, idx));
          }
        }
        else if (type === "as" && command.st === "ignore_spellcheck") {
          const si = command.si;
          const ei = command.ei;
          const data: GoogleDocsMeta = {
            api: "save",
            requestId: reqId,
            url: window.location.href,
            type: "spellcheck",
            startPosition: si,
            endPosition: ei,
            timestamp: Date.now(),
            category: "as",
            index: index
          }
          postMessageToContentScript(data);
        }
      }

      try{
        const commands = bundles[0].commands as Array<DocElement>;
        const reqId = bundles[0].reqId;
        commands.forEach((command, index) => {
          parseCommands(command, reqId, index);
        });

      } catch(e) {
        console.log("bundles exception:", e);
      }

    }
    else if (meta.url.includes("/assistwriting")) {
      try {
        const body = JSON.parse(msg.body);
        const suggestionText = body[0][0];
        const docId = body[0][8];

        const data: GoogleDocsMeta = {
          api: "assistwriting",
          requestId: 0,
          url: window.location.href,
          type: "assistwriting",
          content: suggestionText,
          timestamp: Date.now(),
          index: 0,
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
