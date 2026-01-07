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
  Profile
} from "../shared/types";
import { isOriginGranted } from "../shared/grantedOrigins";
import { insertTrace } from "../api/trace";

let previous : TraceRecord = {
  url: "",
  page_type: "",
  author: "",
  container_id: 0,
  event_type: "",
  message: "",
  cursor_position: 0,
  event_time: "",
  event_value: "",
  event_id: "",
  event_state: "",
  tag_name: "",
  element_text: "",
  offset_x: 0,
  offset_y: 0,
  width: 0,
  height: 0,
  x_path: "",
};

const injectedFor = new Map<number, string>(); // tabId -> lastInjectedUrl

let lastMutation : TraceRecord = previous;
let apiContent : string = "";
let token: string | undefined = undefined;

chrome.storage.local.get("token").then(result => {
  token = result.token as string;
});

const handleUserEvent = async (
  msg: {type: MessageType, payload: UserEventTrace},
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (!_sender.tab?.id || !_sender.tab?.url) {
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

    await insertTrace(trace, token);
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
    if (trace.event_value === "Backspace" || trace.event_value === "Delete") {
      trace.event_type = "delete";
    }
    else {
      trace.event_type = "insert";
    }
  }
  else if (eventType === "input") {
    if (previous.event_type === "insert" || previous.event_type === "delete") {
      previous.event_state = trace.event_state;
      await insertTrace(trace, token);
    }
  }
  else if (eventType === "mouseenter") {
  }
  else if (eventType === "mouseleave") {
  }
  else if (eventType === "blur") {
  }

  previous = trace;
};

const handleNavigationEvent = async (
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

  await insertTrace(trace, token);
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
    await insertTrace(trace, token);
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

  const endpoint = msg.payload.endpoint;

  if (endpoint === "assistwriting") {
    apiContent = msg.payload.eventState ?? "";
  }
  else if (endpoint === "save") {
    const eventType = msg.payload.eventType === "is" ? "insert" : "delete";
    let eventValue = msg.payload.eventValue;
    if (eventType === "delete") {
      eventValue = undefined;
    }

    const trace : TraceRecord = {
      url: msg.payload.url,
      page_type: msg.payload.pageType,
      author: msg.payload.author,
      container_id: null,

      event_type: eventType,
      message: null,
      cursor_position: msg.payload.startPosition?? null,

      event_time: msg.payload.eventTime,
      event_value: eventValue?? null,
      event_id: extractTurnNumber(msg.payload.eventId) ?? null,
      event_state: apiContent,

      tag_name: null,
      element_text: null,
      offset_x: null,
      offset_y: null,
      x_path: null,
      width: null,
      height: null,
    };

    await insertTrace(trace, token);
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
      sendResponse({...response, origin: "chatgpt"});
      return;
    }
    if (url.host === "docs.google.com") {
      sendResponse({...response, origin: "googledocs"});
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
  else {
    console.log("Unknown message type in content-script:", msg);
  }
  return true; // keep channel open for async
});

chrome.tabs.onCreated.addListener(async (tab: chrome.tabs.Tab) => {
  console.log("[bg] action clicked:", tab.id, tab.url);
});

chrome.tabs.onReplaced.addListener(async (addedTabId: number, removedTabId: number) => {
  console.log("[bg] tab replaced:", addedTabId, removedTabId)
});

const checkPermissionGranted = async (url: URL) => {
  const originPattern = `${url.origin}/*`;
  const hasPermission = await chrome.permissions.contains({
    permissions: ["scripting"],
    origins: [originPattern]
  });

  return hasPermission
};

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) return;

  const url = new URL(tab.url);
  const hasPermission = await checkPermissionGranted(url);

  if (hasPermission) {
    try {
      const res = await chrome.tabs.sendMessage(tab.id!, { type: "PING", tab: tab });
      if (res.ok) {
        // already running content-script
        chrome.action.setIcon({ imageData: getCapturingIcon(), tabId: tab.id });
        return;
      }
    } catch (error) {
      chrome.action.setIcon({ imageData: getActiveIcon(), tabId: tab.id });
    }
  } else {
    chrome.action.setIcon({ imageData: getDefaultIcon(), tabId: tab.id });
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
          const res = await chrome.tabs.sendMessage(details.tabId, { type: "PING", tab: details });
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
        handleNavigationEvent(details.url);
      }
      else {
        chrome.action.setIcon({ imageData: getActiveIcon(), tabId: details.tabId });
      }
    } else {
      chrome.action.setIcon({ imageData: getDefaultIcon(), tabId: details.tabId });
    }
  }
});

chrome.permissions.onAdded.addListener(async (permissions) => {
  const [tab] = await chrome.tabs.query({ active: true, url: permissions.origins?.[0] });

  try {
    const res = await chrome.tabs.sendMessage(tab.id!, { type: "PING", tab: tab });
    if (res.ok) {
      await chrome.action.setIcon({imageData: getCapturingIcon(), tabId: tab.id });
    }
    else {
      await chrome.action.setIcon({imageData: getActiveIcon(), tabId: tab.id });
    }
  } catch (e) {
    await checkPermissionGranted(new URL(tab.url!));
  }

  chrome.action.openPopup();
});

chrome.permissions.onRemoved.addListener(async (permissions) => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  chrome.action.setIcon({ imageData: getDefaultIcon(), tabId: tab.id });
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedFor.delete(tabId)
});

chrome.storage.onChanged.addListener(
  async (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === 'local' && changes.token) {
      token = changes.token.newValue as string | undefined;
    }
  }
);

chrome.runtime.onMessageExternal.addListener(
  async (msg: any, sender: chrome.runtime.MessageSender, sendResponse: (res?: any) => void
) => {
  if (msg?.type !== "AUTH_CODE") return;

  const jwt = await fetchJson<{token: string}>("/api/extension/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { code: msg.code },
  });

  await chrome.storage.local.set(jwt);
  token = jwt.token;

  const profile = await fetchJson<Profile>("/api/profile", {
    token: token,
  });
  await chrome.storage.local.set({ profile });

  sendResponse({ ok: true });
  await chrome.action.openPopup();
  //sendResponse({ok: false, error: "Failed to fetch profile"});

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
