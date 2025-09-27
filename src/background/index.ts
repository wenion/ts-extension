import { now } from "../shared/util";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[bg] installed at", now());
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "PING") {
    sendResponse({ ok: true, from: "background", at: now() });
  }
  return true; // keep channel open for async
});
