import { fetchJson, HttpError } from "../api/fetch";
import { now } from "../shared/util";
import {
  getDefaultIcon,
  getCapturingIcon,
  getActiveIcon
} from "./icons";
import {
  UserEventTrace,
  TraceSource,
  Profile,
} from "../shared/types";
import { isOriginGranted, removeGrantedOrigin } from "../shared/grantedOrigins";
import { insertTrace, insertTraces } from "../api/trace";
import { TraceBuffer } from "./buffer";

const sendTrace = async (trace: UserEventTrace, tabId: number, url: string) => {
  const onError = async (tabId: number, url: string, response: Response) => {
      // TODO: logout => stop content-script / clear profile / badge update
    if (response.status === 401) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: "REMOVE_CONTENT_SCRIPT" });
        removeGrantedOrigin(url);
      } catch (e) {
        console.error("Error sending REMOVE_CONTENT_SCRIPT message", e);
      }
      await chrome.storage.local.remove("profile");

      const hasPermission = await checkPermissionGranted(new URL(url));
      if (hasPermission) {
        try {
          const res = await chrome.tabs.sendMessage(tabId, { type: "PING" });
          if (res.ok) {
            // already running content-script
            chrome.action.setIcon({ imageData: getCapturingIcon(), tabId: tabId });
            return;
          }
        } catch (error) {
          chrome.action.setIcon({ imageData: getActiveIcon(), tabId: tabId });
        }
      } else {
        chrome.action.setIcon({ imageData: getDefaultIcon(), tabId: tabId });
      }
    }
    else {
      console.error("sendTrace error:", response.status, response.statusText);
    }
  };

  try {
    await insertTrace(trace, token);
  } catch (error) {
    if (error instanceof HttpError) {
      await onError(tabId, url, new Response(null, { status: error.status }));
    }
  };
};

const traceBuffer = new TraceBuffer<UserEventTrace>(
  async (traces) => {
    await insertTraces(traces, token);
  }
);

let token: string | undefined = undefined;
let mutationInProgress: boolean = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

function resetTimeout(duration: number) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  timeoutId = setTimeout(() => {
    mutationInProgress = false;
    timeoutId = null;
  }, duration);
}

chrome.storage.local.get("token").then(result => {
  token = result.token as string;
});

const handleUserEvent = async (
  msg: {type: TraceSource, payload: UserEventTrace},
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (!_sender.tab || _sender.tab.id == null || !_sender.tab.url) {
    return;
  }

  if (msg.payload.eventType === "mutation") {
    // if it's the last mutation, end the allow
    if (mutationInProgress) {
      resetTimeout(10000);
    }
    else {
      return;
    }
  }
  if (
    msg.payload.eventType === "pointerdown" ||
    (msg.payload.eventType === "keydown" && msg.payload.key === "Enter")
  ) {
    if (!mutationInProgress) {
      // allow some time for the DOM to update before capturing the mutation
      mutationInProgress = true;

      // setTimeout to cancel if no any mutation observed within the delay time
      resetTimeout(15000);
    }
  }

  await traceBuffer.add(
    { ...msg.payload, url: msg.payload.url ? msg.payload.url : _sender.tab.url }
  );
};

const handleNavigationEvent = async (
  tabId: number,
  url: string
) => {
  const userTrace = {
    tag: "NAVIGATION",
    url: url,
    eventType: "navigation",
    timeStamp: Date.now(),
    source: "UserEvent",
  } as UserEventTrace;

  await sendTrace(userTrace, tabId, url);
};

export function extractTurnNumber(id?: string | null): string | null {
  if (!id) return null;
  const match = id.match(/conversation-turn-(\d+)/);
  return match ? match[1] : null;
}

chrome.runtime.onMessage.addListener(async(msg: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (msg.type === "REMOVE_CONTENT_SCRIPT") {
    sendResponse({ ok: true, from: "content-script", at: now() });
  }
  else if (msg.type === "CONTENT_SCRIPT_LOADED") {
    const url = new URL(msg.payload.url);
    const response = { ok: true, from: "content-script", at: now() };
    if (url.host === "chatgpt.com") {
      sendResponse({...response, origin: "chatgpt"});
      return;
    }
    if (url.host === "docs.google.com") {
      sendResponse({...response, origin: "google_docs"});
      return;
    }
    if (url.host === "gemini.google.com") {
      sendResponse({...response, origin: "gemini"});
      return;
    }
    if (url.host === "www.overleaf.com") {
      sendResponse({...response, origin: "overleaf"});
      return;
    }
    if (url.host === "claude.ai") {
      sendResponse({...response, origin: "claude"});
      return;
    }
    sendResponse(response);
  }
  else if (msg.type === "UserEvent") {
    handleUserEvent(msg as {type: TraceSource, payload: UserEventTrace}, _sender, sendResponse);
  }
  else {
    console.log("Unknown message type in content-script:", msg);
  }
  return true; // keep channel open for async
});

// chrome.tabs.onCreated.addListener(async (tab: chrome.tabs.Tab) => {
//   console.log("[bg] action clicked:", tab.id, tab.url);
// });

// chrome.tabs.onReplaced.addListener(async (addedTabId: number, removedTabId: number) => {
//   console.log("[bg] tab replaced:", addedTabId, removedTabId)
// });

chrome.tabs.onRemoved.addListener(async (tabId: number) => {
  traceBuffer.flush();
});

const checkPermissionGranted = async (url: URL) => {
  if (!["http:", "https:"].includes(url.protocol)) {
    return false;
  }

  const originPattern = `${url.origin}/*`;

  return chrome.permissions.contains({
    permissions: ["scripting"],
    origins: [originPattern]
  });
};

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) return;

  if (changeInfo.status === "loading") {
    traceBuffer.flush();
  }

  const hasPermission = await checkPermissionGranted(new URL(tab.url));
  if (hasPermission) {
    try {
      const res = await chrome.tabs.sendMessage(tabId, { type: "PING" });
      if (res.ok) {
        // already running content-script
        chrome.action.setIcon({ imageData: getCapturingIcon(), tabId: tabId });
        return;
      }
    } catch (error) {
      chrome.action.setIcon({ imageData: getActiveIcon(), tabId: tabId });
    }
  } else {
    chrome.action.setIcon({ imageData: getDefaultIcon(), tabId: tabId });
  }
});

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (
    details.transitionType !== "auto_subframe" &&
    details.transitionType !== "manual_subframe"
  ) {
    const url = new URL(details.url);
    const hasPermission = await checkPermissionGranted(url);

    if (hasPermission) {
      const granted = await isOriginGranted(details.url);

      if (granted) {
        try {
          const res = await chrome.tabs.sendMessage(details.tabId, { type: "PING" });
          if (res.ok) {
            // already running content-script
            chrome.action.setIcon({ imageData: getCapturingIcon(), tabId: details.tabId });
            return;
          }
        } catch (error) {
          // start content-script
          await chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            files: ['content-script.js'],
          });
          chrome.action.setIcon({ imageData: getCapturingIcon(), tabId: details.tabId });
        }
        handleNavigationEvent(details.tabId, details.url);
      }
      else {
        chrome.action.setIcon({ imageData: getActiveIcon(), tabId: details.tabId });
      }
    } else {
      chrome.action.setIcon({ imageData: getDefaultIcon(), tabId: details.tabId });
    }
  }
});

// chrome.permissions.onAdded.addListener(async (permissions) => {
//   // chrome.storage.session.set({ permDirty: true });
//   // Re-evaluate only when a tab becomes meaningful - chrome.tabs.onActivated
// });

// chrome.permissions.onRemoved.addListener(async (permissions) => {
//   // chrome.storage.session.set({ permDirty: true });
//   // Re-evaluate only when a tab becomes meaningful - chrome.tabs.onActivated
// });

chrome.storage.onChanged.addListener(
  async (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === 'local' && changes.token) {
      token = changes.token.newValue as string | undefined;
    }
  }
);

chrome.runtime.onMessageExternal.addListener(
  (msg: any, sender: chrome.runtime.MessageSender, sendResponse: (res?: any) => void
) => {
  (async () => {
    try {
      if (!sender.origin?.startsWith(process.env.NEXT_PUBLIC_SITE_URL!)) {
        sendResponse({ ok: false, error: "Unauthorized sender" });
        return;
      }

      if (msg?.type !== "AUTH_CODE") {
        sendResponse({ ok: false, error: "Invalid message type" });
        return;
      }

      const res = await fetchJson<{token: string} | undefined>(
        "/api/extension/exchange",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { code: msg.code },
        },
      );

      if (!res?.token) {
        sendResponse({ ok: false, error: "Token exchange failed" });
        return;
      }

      await chrome.storage.local.set({ token: res.token });
      token = res.token;

      const profile = await fetchJson<Profile | undefined>(
        "/api/profile",
        { token: token, }
      );

      if (!profile) {
        sendResponse({ ok: false, error: "Missing response from User's profile" });
        return;
      }

      await chrome.storage.local.set({ profile });

      sendResponse({ ok: true });
    } catch (err) {
        console.error("onMessageExternal failed:", err);
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
  })();

  return true; // keep channel open for async sendResponse
});

chrome.runtime.onStartup.addListener(async () => {
});

chrome.runtime.onInstalled.addListener(async (details: chrome.runtime.InstalledDetails) => {
  if (details.reason === "install") {
    const img16  = getDefaultIcon(16);
    const img32  = getDefaultIcon(32);
    chrome.action.setIcon({ imageData: { 16: img16, 32: img32 } });
    // chrome.tabs.create({ url: "welcome.html" });
  }
});
