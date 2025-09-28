import { now } from "../shared/util";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[bg] installed at", now());
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "LOGIN") {
    chrome.storage.sync.set({ auth: msg.payload });
  } else if (msg?.type === "LOGOUT") {
    chrome.storage.sync.remove("auth", () => {
      sendResponse({ ok: true, from: "background", at: now() });
    });
  } else if (msg?.type === "get-storage") {
    chrome.storage.sync.get("auth", (data) => {
      sendResponse({ type: "storage-changed", name: "auth", payload: data.auth });
    });
  }
  return true; // keep channel open for async
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" && area !== "local") return;

  const payload = changes.auth ? changes.auth.newValue : null;
  const message = { type: "storage-changed", name: "auth", payload };
  try {
    chrome.runtime.sendMessage(message, () => {
      const err = chrome.runtime.lastError;
      if (!err) return;
      // Ignore common benign cases when nobody is listening
      if (
        err.message?.includes("Receiving end does not exist") ||
        err.message?.includes("The message port closed before a response was received.")
      ) {
        // no open listeners right now; that's fine
        return;
      }
      console.warn("[bg] sendMessage error:", err.message);
    });
  } catch (e) {
    console.warn("[bg] sendMessage threw:", e);
  }
});