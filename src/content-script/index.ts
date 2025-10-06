import { now } from "../shared/util";
import { addEventListeners } from "./listenerEvent";

console.log("[cs] injected at", now());

declare const __MESSENGER_CONFIG__: {
  PAGE_TAG: string;
  EXT_TAG: string;
  ALLOWED_ORIGINS: string[];
};
const { PAGE_TAG, EXT_TAG, ALLOWED_ORIGINS } = __MESSENGER_CONFIG__;
const allowedOrigins = new Set(ALLOWED_ORIGINS);

window.addEventListener("message", (event) => {
  if (event.source !== window) return;                    // ignore cross-frame
  if (!allowedOrigins.has(event.origin)) return;         // origin check

  const msg = event.data;
  if (msg?.source !== PAGE_TAG) return;                  // schema/tag check

  // Forward to background
  chrome.runtime.sendMessage({ type: msg.type, payload: msg.payload }, (response) => {
    // Reply back only to the verified origin
    window.postMessage(
      { source: EXT_TAG, type: "PONG", payload: response },
      event.origin
    );
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  sendResponse({ ok: true, from: "content-script", at: now() });
  return true; // keep channel open for async
});

// Add listeners to the main document
addEventListeners(document);
