import { fetchJson } from "../api/fetch";
import { now, getPageType } from "../shared/util";
import {
  getDefaultIcon,
  getCapturingIcon,
  getActiveIcon
} from "./icons";

import {
  ApiEventTrace,
  DOMMutationEventTrace,
  MessageType,
  TraceRecord,
  UserEventTrace,
  Profile,
  Source,
} from "../shared/types";
import { isOriginGranted, removeGrantedOrigin } from "../shared/grantedOrigins";
import { insertTrace } from "../api/trace";

function createEmptyTraceRecord(): TraceRecord {
  return {
    url: "",
    page_type: null,
    author: null,
    container_id: 0,
    event_type: null,
    message: null,
    cursor_position: 0,
    end_position: null,
    event_time: null,
    event_value: null,
    event_id: null,
    event_state: null,
    tag_name: null,
    element_text: null,
    offset_x: null,
    offset_y: null,
    width: null,
    height: null,
    x_path: null,
  };
}

let previous : TraceRecord = createEmptyTraceRecord();

const sendTrace = async (trace: TraceRecord, tabId: number, url: string) => {
  const onError = async (response: Response) => {
    if (response.status === 401) {
      // TODO: logout => stop content-script / clear profile / badge update
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
  };

  if (trace.event_type === "keydown") {
    if (previous.event_type === "keydown") {
      await insertTrace(previous, token, onError);
    }
    else if (previous.event_type === "keydown-input") {
      previous.event_type = "keydown";
      await insertTrace(previous, token, onError);
    }
    else if (previous.event_type === "paste" || previous.event_type === "cut") {
      await insertTrace(previous, token, onError);
    }
  }
  else if (trace.event_type === "input") {
    if (previous.event_type === "keydown") {
      trace.event_type = "keydown-input";
      trace.event_value = previous.event_value;
    }
  }
  else if (trace.event_type === "keystroke") {
    if (previous.event_type === "keydown-input") {
      if (previous.event_value === trace.event_value) {
        previous.cursor_position = trace.cursor_position;
      }

      previous.event_type = "keydown";
      await insertTrace(previous, token, onError);
      trace = createEmptyTraceRecord();
    }
    else if (previous.event_type === "keydown") {
      if (trace.event_value === null) {
        if (previous.event_value === "Backspace") {
          previous.cursor_position = trace.cursor_position;
          previous.end_position = trace.end_position;
        }
      }
      else if (trace.event_value === "\n") {
        if (previous.event_value === "Enter") {
          previous.cursor_position = trace.cursor_position;
        }
      }

      previous.event_type = "keydown";
      await insertTrace(previous, token, onError);
      trace = createEmptyTraceRecord();
    }
    else if (previous.event_type === "paste") {
      await insertTrace(previous, token, onError);
      trace = createEmptyTraceRecord();
    }
    else if (previous.event_type === "cut") {
      await insertTrace(previous, token, onError);
      trace = createEmptyTraceRecord();
    }
  }
  else if (trace.event_type === "paste") {
    if (previous.event_type === "keydown-input") {
      previous.event_type = "keydown";
      await insertTrace(previous, token, onError);
    }
    else if (previous.event_type === "cut") {
      await insertTrace(previous, token, onError);
    }
  }
  else if (trace.event_type === "cut") {
    if (previous.event_type === "keydown-input") {
      previous.event_type = "keydown";
      await insertTrace(previous, token, onError);
    }
    else if (previous.event_type === "paste") {
      await insertTrace(previous, token, onError);
    }
  }
  else {
    if (previous.event_type === "keydown-input") {
      previous.event_type = "keydown";
      await insertTrace(previous, token, onError);
    }
    else if (previous.event_type === "paste" || previous.event_type === "cut") {
      await insertTrace(previous, token, onError);
    }
    else if (previous.event_type === "keydown") {
      await insertTrace(previous, token, onError);
    }
    await insertTrace(trace, token, onError);
  }

  previous = trace;
};

let lastMutation : TraceRecord = previous;
let token: string | undefined = undefined;

chrome.storage.local.get("token").then(result => {
  token = result.token as string;
});

const handleUserEvent = async (
  msg: {type: MessageType, payload: UserEventTrace},
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (!_sender.tab || _sender.tab.id == null || !_sender.tab.url) {
    return;
  }

  const trace : TraceRecord = {
    url: _sender.tab.url,
    page_type: getPageType(_sender.tab.url),
    author: msg.payload.author ?? "other",
    container_id: msg.payload.containerId ?? null,

    event_type: msg.payload.eventType,
    message: msg.payload.message?? null,
    cursor_position: msg.payload.cursorPosition ?? null,
    end_position: null,

    event_time: new Date().toISOString(),
    event_value: msg.payload.eventValue?? null,
    event_id: msg.payload.eventId?? null,
    event_state: msg.payload.eventState?? null,

    tag_name: msg.payload.tag,
    element_text: "",
    offset_x: msg.payload.clientX,
    offset_y: msg.payload.clientY,
    x_path: msg.payload.xpath,
    width: msg.payload.width,
    height: msg.payload.height,
  }

  const eventType = trace.event_type;
  const trim = (v?: string | null) => (v ?? "").trim();

  if (eventType === "pointerdown") {
    trace.event_type = "click";
    const tag = trace.tag_name;

    if (tag === "input") {
      trace.element_text =
        trim(msg.payload.label) ||
        trim(msg.payload.placeholder) ||
        trim(msg.payload.name);
    }
    else if (tag === "textarea") {
      trace.element_text =
        trim(msg.payload.label) ||
        trim(msg.payload.placeholder) ||
        trim(msg.payload.name) ||
        trim(msg.payload.innerText);
    }
    else if (tag === "select") {
      trace.element_text =
        trim(msg.payload.label) ||
        trim(msg.payload.name) ||
        trim(msg.payload.valueLabel);
    }
    else if (tag === "button" || tag === "a") {
      trace.element_text =
        trim(msg.payload.label) ||
        trim(msg.payload.name) ||
        trim(msg.payload.innerText);
    }
    else {
      trace.element_text =
        trim(msg.payload.label) ||
        trim(msg.payload.innerText) ||
        trim(msg.payload.textContent);
    }
  }
  else if (eventType === "change") {
  }
  else if (eventType === "select") {
  }
  else if (eventType === "mouseup") {
  }
  else if (eventType === "scroll") {
  }
  else if (eventType === "wheel") {
  }
  else if (eventType === "copy") {
  }
  else if (eventType === "paste") {
  }
  else if (eventType === "keydown") {
    const payload = msg.payload;
    if (payload.ctrlKey || payload.altKey || payload.metaKey) {
      return;
    }
    if (payload.shiftKey && payload.eventValue === "Shift") {
      return;
    }
  }
  else if (eventType === "input") {
  }
  else if (eventType === "mouseenter") {
  }
  else if (eventType === "mouseleave") {
  }
  else if (eventType === "blur") {
  }

  await sendTrace(trace, _sender.tab.id, _sender.tab.url);
};

const handleNavigationEvent = async (
  tabId: number,
  url: string
) => {
  const trace : TraceRecord = {
    url: url,
    page_type: getPageType(url),
    
    author: null,
    container_id: null,

    event_type: "navigation",
    message: null,
    cursor_position: null,
    end_position: null,

    event_time: new Date().toISOString(),
    event_value: null,
    event_id: null,
    event_state: null,

    tag_name: null,
    element_text: null,
    offset_x: null,
    offset_y: null,
    x_path: null,
    width: null,
    height: null,
  };

  if (previous.event_type === "navigation" && previous.url === trace.url) {
    previous = trace;
    return;
  }

  await sendTrace(trace, tabId, url);
  previous = trace;
};

export function extractTurnNumber(id?: string | null): string | null {
  if (!id) return null;
  const match = id.match(/conversation-turn-(\d+)/);
  return match ? match[1] : null;
}

const handleDomMutationEvent = async (
  msg: {type: MessageType, payload: DOMMutationEventTrace},
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (!_sender.tab?.id || !_sender.tab?.url) {
    return;
  }

  const trace : TraceRecord = {
    url: msg.payload.url,
    page_type: msg.payload.pageType?? null,
    author: msg.payload.author,
    container_id: null,

    event_type: msg.payload.eventType,
    message: msg.payload.message,
    cursor_position: null,
    end_position: null,

    event_time: msg.payload.eventTime,
    event_value: null,
    event_id: extractTurnNumber(msg.payload.eventId) ?? null,
    event_state: null,

    tag_name: msg.payload.tag,
    element_text: msg.payload.eventId,
    offset_x: null,
    offset_y: null,
    x_path: null,
    width: null,
    height: null,
  };

  if (
    previous.event_type === "mutation" &&
    previous.element_text === trace.element_text &&
    previous.message === trace.message
  ) {
    previous = trace;
    return;
  }

  if (
    lastMutation.event_type === "mutation" &&
    lastMutation.element_text === trace.element_text &&
    lastMutation.message === trace.message
  ) {
    // skip duplicate
  }
  else {
    await sendTrace(trace, _sender.tab.id, _sender.tab.url);
  }

  previous = trace;
  lastMutation = trace;
};

const handleApiEvent = async (
  msg: {type: MessageType, payload: ApiEventTrace},
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (!_sender.tab?.id || !_sender.tab?.url) {
    return;
  }
  const payload = msg.payload;

  if (payload.source === Source.GOOGLE_DOCS) {
    const trace : TraceRecord = {
      url: _sender.tab.url,
      page_type: getPageType(_sender.tab.url),
      author: payload.author ?? "other",
      container_id: null,

      event_type: payload.eventType,
      message: null,
      cursor_position: payload.startPosition ?? null,
      end_position: payload.endPosition ?? null,

      event_time: new Date().toISOString(),
      event_value: payload.eventValue?? null,
      event_id: payload.eventId?? null,
      event_state: payload.eventState?? null,

      tag_name: null,
      element_text: null,
      offset_x: null,
      offset_y: null,
      x_path: null,
      width: null,
      height: null,
    }
    await sendTrace(trace, _sender.tab.id, _sender.tab.url);
  }
};

chrome.runtime.onMessage.addListener(async(msg: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (msg.type === "REMOVE_CONTENT_SCRIPT") {
    sendResponse({ ok: true, from: "content-script", at: now() });
  }
  else if (msg.type === "CONTENT_SCRIPT_LOADED") {
    const url = new URL(msg.payload.url);
    const response = { ok: true, from: "content-script", at: now() };
    if (url.host === "chatgpt.com") {
      sendResponse({...response, origin: Source.CHATGPT});
      return;
    }
    if (url.host === "docs.google.com") {
      sendResponse({...response, origin: Source.GOOGLE_DOCS});
      return;
    }
    sendResponse(response);
  }
  else if (msg.type === MessageType.UserEvent) {
    handleUserEvent(msg, _sender, sendResponse);
  }
  else if (msg.type === MessageType.DOMMutationEvent) {
    handleDomMutationEvent(msg, _sender, sendResponse);
  }
  else if (msg.type === MessageType.ApiEvent) {
    handleApiEvent(msg, _sender, sendResponse);
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
