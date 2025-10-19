import { now } from "../shared/util";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[bg] installed at 222", now());
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "LOGIN") {
    const session = msg.payload;
    chrome.storage.sync.set({ "session": session });
  }
  else if (msg.type === "LOGOUT") {
    console.log("[bg] LOGOUT", msg.payload);
    chrome.storage.sync.remove("session", () => {
      sendResponse({ ok: true, from: "background", at: now() });
    });
  }
  else if (msg.type === "get-storage") {
    chrome.storage.sync.get("session", (data) => {
      sendResponse({ type: "storage-changed", name: "session", payload: data.session });
    });
  }
  else if (msg.type === "trace") {
    // Simply log the trace data for now; could be extended to store or process
  }
  return true; // keep channel open for async
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" && area !== "local") return;

  const payload = changes.session ? changes.session.newValue : null;
  const message = { type: "storage-changed", name: "session", payload };
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