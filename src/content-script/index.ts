import { now } from "../shared/util";
import { addEventListeners } from "./listenerEvent";
import { captureChatGPTInteractions } from "./platform/chatgpt";

declare const __MESSENGER_CONFIG__: {
  PAGE_TAG: string;
  EXT_TAG: string;
  ALLOWED_ORIGINS: string[];
};
const { PAGE_TAG, EXT_TAG, ALLOWED_ORIGINS } = __MESSENGER_CONFIG__;
const allowedOrigins = new Set(ALLOWED_ORIGINS);

// Listen to messages from the page
window.addEventListener("message", (event) => {
  if (event.source !== window) return;                   // ignore cross-frame
  if (!allowedOrigins.has(event.origin)) return;         // origin check

  const msg = event.data;
  if (msg?.source !== PAGE_TAG) return;                  // schema/tag check

  // Forward to background
  chrome.runtime.sendMessage({ type: msg.type, payload: msg.payload });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("[cs] got message from bg", msg);
  sendResponse({ ok: true, from: "content-script", at: now() });
  return true; // keep channel open for async
});

// Platform-specific interaction capture
const host = window.location.host;
if (host === "chatgpt.com") {
  captureChatGPTInteractions();
}
else if (host === "docs.google.com") {
  (function inject() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    // script.onload = function (this) {
    //   this.remove();
    // };
    script.addEventListener("load", () => {
      script.remove();
    });
    (document.head || document.documentElement).appendChild(script);
  })();
}

const navigator = () => {
  const data = {
    eventType: "navigation",
    url: window.location.href,
  };
  chrome.runtime.sendMessage({ type: "trace", payload: data });
}

navigator();

// Add listeners to the main document
addEventListeners(document);
