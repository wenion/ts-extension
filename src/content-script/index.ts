import { now } from "../shared/util";
import { PopupToExtensionEvent } from "../shared/config/eventTypes";
import { MessageType } from "../shared/types";
import {
  installUserEventTracker,
  installNavigationTracker,
  installDomChangeTracker
 } from "./interactionTrackers";
import {
  chatgptMutationConfig,
  handleChatgptMutations
 } from "./platform/chatgpt";

declare const __MESSENGER_CONFIG__: {
  PAGE_TAG: string;
  INJ_TAG: string;
  EXT_TAG: string;
  ALLOWED_ORIGINS: string[];
};
const { PAGE_TAG, INJ_TAG, EXT_TAG, ALLOWED_ORIGINS } = __MESSENGER_CONFIG__;
const allowedOrigins = new Set(ALLOWED_ORIGINS);

// Listen to Home Page messages
// Listen to injected script messages
window.addEventListener("message", (event) => {
  if (event.source !== window) return;                   // ignore cross-frame
  if (!allowedOrigins.has(event.origin)) return;

  const msg = event.data;
  if (msg?.source === PAGE_TAG) {
    if (msg.type === PopupToExtensionEvent.USER_LOGIN) {
      // Forward Login Event to Extension
      chrome.runtime.sendMessage({ type: MessageType.LoginEvent, payload: msg.payload });
    }
  }
  else if (msg?.source === INJ_TAG) {
    chrome.runtime.sendMessage({ type: MessageType.ApiEvent, payload: msg.payload });
  }
});

// Listen to messages from the background
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  sendResponse({ ok: true, from: "content-script", at: now() });
  return true; // keep channel open for async
});

// Platform-specific interaction capture
const host = window.location.host;
if (host === "chatgpt.com") {
  const targetNode = document.body;
  installDomChangeTracker(targetNode, chatgptMutationConfig, handleChatgptMutations);
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

installNavigationTracker();

// Add listeners to the main document
installUserEventTracker(document);
