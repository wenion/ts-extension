import { fetchJson, HttpError } from "../api/fetch";
import { now } from "../shared/util";
import { bus } from "./bus";
import {
  getDefaultIcon,
  getCapturingIcon,
  getActiveIcon
} from "./icons";
import {
  UserEventTrace,
  TraceSource,
  Profile,
  GoogleDocsMeta,
} from "../shared/types";
import { isOriginGranted, removeGrantedOrigin } from "../shared/grantedOrigins";
import { insertTrace, insertTraces } from "../api/trace";
import { TraceBuffer } from "./buffer";
import {
  onNavigate,
  onKeyStroke,
} from "./googleDocs";

export type DocState = {
  state: string;
  value: string;
  text?: string;
  startPosition?: number;
  endPosition?: number;
  done: boolean;
  timestamp: number;
  requestId?: number;
  url: string;
  type: string;
};

const currentMap = new Map<string, DocState>();

bus.addEventListener("GOOGLE_DOCS_EVENT", async (e: Event) => {
  const customEvent = e as CustomEvent;

  const eventType = customEvent.detail.eventType; // keystroke or navigate
  const data = customEvent.detail.data;


  if (data.type === "insert") {
    for (let i= 0; i < data.letter.length; i++) {
      const key = data.letter[i] === "\n" ? "Enter" : data.letter[i] === " " ? "Space" : data.letter[i]; //"[Enter]"

      const trace : UserEventTrace = {
        eventType: eventType,
        elementType: data.type,
        source: "UserEvent",
        textContent: data.preState,
        code: key,
        key: key,
        timestamp: data.lastUpdated + i,
        author: "human",
        startPosition: data.startPosition + i,
        endPosition: data.startPosition + i + 1,
        eventValue: data.letter[i],
        eventState: data.state,
        url: data.url,
      }

      traceBuffer.add(trace);
    }
  }
  else {
    const key = data.letter === "\n" ? "Enter" : data.letter === " " ? "Space" : data.letter; //"[Enter]"
    const trace : UserEventTrace = {
      eventType: eventType,
      elementType: data.type,
      source: "UserEvent",
      textContent: data.preState,
      code: key,
      key: key,
      timestamp: data.lastUpdated,
      author: "human",
      startPosition: data.startPosition,
      endPosition: data.endPosition,
      eventValue: data.letter,
      eventState: data.state,
      url: data.url,
    }

    traceBuffer.add(trace);

  }
});

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

function findAllMatches(str: string, sub: string): { start: number; end: number }[] {
  const results = [];
  let index = 0;

  while (true) {
    const start = str.indexOf(sub, index);
    if (start === -1) break;

    results.push({
      start,
      end: start + sub.length - 1,
    });

    index = start + 1; // allow overlap
  }

  return results;
}

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
    (msg.payload.eventType === "keydown" && msg.payload.key === "Enter") ||
    msg.payload.xpath?.startsWith('//*[@id="main-content"]') ||
    msg.payload.xpath?.startsWith('//*[@id="prompt-textarea"]')
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

  if (msg.payload.eventType === "keydown") {
    if (msg.payload.eventValue === "Enter") {
      const cache: DocState = {
        state: msg.payload.eventState || "",
        value: "\n",
        text: msg.payload.textContent,
        startPosition: msg.payload.startPosition,
        done: true,
        url: _sender.tab.url,
        timestamp: Date.now(),
        type: "Insert",
      };
      currentMap.set(_sender.tab.url, cache);

      const data = {} as UserEventTrace;
      data.eventType = "keystroke";
      data.key = "Enter";
      data.code = "Enter";
      data.eventValue = "\n";
      data.eventState = msg.payload.eventState;
      data.startPosition = msg.payload.startPosition ? msg.payload.startPosition : 0;
      data.endPosition = data.startPosition + 1;
      data.url = _sender.tab.url;
      data.timestamp = Date.now();
      data.source = "UserEvent";
      data.author = "human";
      data.textContent = msg.payload.textContent;
      data.tag = msg.payload.tag;
      data.elementType = "insert";

      await traceBuffer.add(data);
    }
    else if (msg.payload.key === "Backspace") {
      const start = msg.payload.startPosition;
      const length = msg.payload.eventState?.length || 0;
      const prev = currentMap.get(_sender.tab.url);
      const prevState = prev ? prev.state : "";

      if (prevState !== "") {
        if (prevState === msg.payload.eventState) {
          // delete a letter
          const value = prevState.slice(start, start! + 1);
          const cache: DocState = {
            state: msg.payload.eventState || "",
            value: value,
            text: msg.payload.textContent,
            startPosition: start,
            done: msg.payload.startPosition === 0 ? true : false,
            url: _sender.tab.url,
            timestamp: Date.now(),
            type: "Backspace",
          };
          currentMap.set(_sender.tab.url, cache);
        }
        else {
          const diff = prevState.length - length;
          if (diff === 1) {
            const value = prevState.slice(start, start! + 1);
            if (value === "\n") {
              const cache: DocState = {
                state: msg.payload.eventState || "",
                value: "\n",
                text: msg.payload.textContent,
                startPosition: start! + 1,
                endPosition: start,
                done: true,
                url: _sender.tab.url,
                timestamp: Date.now(),
                type: "Backspace",
              };
              currentMap.set(_sender.tab.url, cache);
              // output
              const data = {} as UserEventTrace;
              data.eventType = "keystroke";
              data.key = "Enter";
              data.code = "Enter";
              data.eventValue = "\n";
              data.eventState = msg.payload.eventState;
              data.startPosition = start! + 1;
              data.endPosition = start;
              data.url = _sender.tab.url;
              data.timestamp = Date.now();
              data.source = "UserEvent";
              data.author = "human";
              data.textContent = msg.payload.textContent;
              data.tag = msg.payload.tag;
              data.elementType = "delete";

              await traceBuffer.add(data);
            }
          }
          else if (diff === prevState.length) {
            // delete all text
            const cache: DocState = {
              state: msg.payload.eventState || "",
              value: prevState,
              text: msg.payload.textContent,
              startPosition: prevState.length,
              endPosition: 0,
              done: true,
              url: _sender.tab.url,
              timestamp: Date.now(),
              type: "Backspace",
            };
            currentMap.set(_sender.tab.url, cache);

            const data = {} as UserEventTrace;
            data.eventType = "keystroke";
            data.key = prevState;
            data.code = prevState;
            data.eventValue = prevState;
            data.eventState = msg.payload.eventState;
            data.startPosition = prevState.length;
            data.endPosition = 0;
            data.url = _sender.tab.url;
            data.timestamp = Date.now();
            data.source = "UserEvent";
            data.author = "human";
            data.textContent = msg.payload.textContent;
            data.tag = msg.payload.tag;
            data.elementType = "delete";

            await traceBuffer.add(data);
          }
          else {
            // delete a part of the text
            let start = msg.payload.startPosition || 0;
            const result = findAllMatches(prevState, msg.payload.eventState || "");
            const match = result.find(m => m.start === start);
            if (match) {
              start = match.start;
            }
            const cache: DocState = {
              state: msg.payload.eventState || "",
              value: prevState.slice(start, diff + start),
              text: msg.payload.textContent,
              startPosition: start,
              endPosition: start + diff,
              done: true,
              url: _sender.tab.url,
              timestamp: Date.now(),
              type: "Backspace",
            };
            currentMap.set(_sender.tab.url, cache);

            const data = {} as UserEventTrace;
            data.eventType = "keystroke";
            data.key = prevState.slice(start, diff + start);
            data.code = prevState.slice(start, diff + start);
            data.eventValue = prevState.slice(start, diff + start);
            data.eventState = msg.payload.eventState;
            data.startPosition = start;
            data.endPosition = start + diff;
            data.url = _sender.tab.url;
            data.timestamp = Date.now();
            data.source = "UserEvent";
            data.author = "human";
            data.textContent = msg.payload.textContent;
            data.tag = msg.payload.tag;
            data.elementType = "delete";

            await traceBuffer.add(data);
          }
        }
      }
      else {
        // empty delete, we can ignore this case
        // but we still need to update the cache
        if (msg.payload.eventState !== "") {
          const cache: DocState = {
            state: msg.payload.eventState || "",
            value: "",
            text: msg.payload.textContent,
            startPosition: msg.payload.startPosition,
            done: false,
            url: _sender.tab.url,
            timestamp: Date.now(),
            type: "Backspace",
          };
          currentMap.set(_sender.tab.url, cache);
        }
      }
    }
    else if (msg.payload.key === "Delete") {
      const start = msg.payload.startPosition;

      const prev = currentMap.get(_sender.tab.url);
      const prevState = prev ? prev.state : "";
      if (prevState !== "") {
        if (prevState === msg.payload.eventState) {
          // will follow with input event
          const value = prevState.slice(start, start! + 1);
          const cache: DocState = {
            state: msg.payload.eventState || "",
            value: value,
            text: msg.payload.textContent,
            startPosition: start,
            done: false,
            url: _sender.tab.url,
            timestamp: Date.now(),
            type: "Delete",
          };
          currentMap.set(_sender.tab.url, cache);
        }
        else {
          const diff = prevState.length - msg.payload.eventState!.length;
          if (diff === 1) {
            const value = prevState.slice(start, start! + 1);
            if (value === "\n") {
              const cache: DocState = {
                state: msg.payload.eventState || "",
                value: "\n",
                text: msg.payload.textContent,
                startPosition: start! + 1,
                endPosition: start,
                done: true,
                url: _sender.tab.url,
                timestamp: Date.now(),
                type: "Delete",
              };
              currentMap.set(_sender.tab.url, cache);
              // output
              const data = {} as UserEventTrace;
              data.eventType = "keystroke";
              data.key = "Enter";
              data.code = "Enter";
              data.eventValue = "\n";
              data.eventState = msg.payload.eventState;
              data.startPosition = start! + 1;
              data.endPosition = start;
              data.url = _sender.tab.url;
              data.timestamp = Date.now();
              data.source = "UserEvent";
              data.author = "human";
              data.textContent = msg.payload.textContent;
              data.tag = msg.payload.tag;
              data.elementType = "delete";

              await traceBuffer.add(data);
            }
          }
          else if (diff === prevState.length) {
            // delete all text
            const cache: DocState = {
              state: msg.payload.eventState || "",
              value: prevState,
              text: msg.payload.textContent,
              startPosition: prevState.length,
              endPosition: 0,
              done: true,
              url: _sender.tab.url,
              timestamp: Date.now(),
              type: "Delete",
            };
            currentMap.set(_sender.tab.url, cache);

            const data = {} as UserEventTrace;
            data.eventType = "keystroke";
            data.key = prevState;
            data.code = prevState;
            data.eventValue = prevState;
            data.eventState = msg.payload.eventState;
            data.startPosition = prevState.length;
            data.endPosition = 0;
            data.url = _sender.tab.url;
            data.timestamp = Date.now();
            data.source = "UserEvent";
            data.author = "human";
            data.textContent = msg.payload.textContent;
            data.tag = msg.payload.tag;
            data.elementType = "delete";

            await traceBuffer.add(data);
          }
          else {
            let start = msg.payload.startPosition || 0;
            const result = findAllMatches(prevState, msg.payload.eventState || "");
            const match = result.find(m => m.start === start);
            if (match) {
              start = match.start;
            }
            const cache: DocState = {
              state: msg.payload.eventState || "",
              value: prevState.slice(start, diff + start),
              text: msg.payload.textContent,
              startPosition: start,
              endPosition: start + diff,
              done: true,
              url: _sender.tab.url,
              timestamp: Date.now(),
              type: "Delete",
            };
            currentMap.set(_sender.tab.url, cache);

            const data = {} as UserEventTrace;
            data.eventType = "keystroke";
            data.key = prevState.slice(start, diff + start);
            data.code = prevState.slice(start, diff + start);
            data.eventValue = prevState.slice(start, diff + start);
            data.eventState = msg.payload.eventState;
            data.startPosition = start;
            data.endPosition = start + diff;
            data.url = _sender.tab.url;
            data.timestamp = Date.now();
            data.source = "UserEvent";
            data.author = "human";
            data.textContent = msg.payload.textContent;
            data.tag = msg.payload.tag;
            data.elementType = "delete";

            await traceBuffer.add(data);
          }
        }
      }
      else {
        // TODO try to get the prev state in initialization or navigation event
        if (msg.payload.eventState !== "") {
          const cache: DocState = {
            state: msg.payload.eventState || "",
            value: "",
            text: msg.payload.textContent,
            startPosition: msg.payload.startPosition,
            done: false,
            url: _sender.tab.url,
            timestamp: Date.now(),
            type: "Delete",
          };
          currentMap.set(_sender.tab.url, cache);
        }
      }
    }
    else if (msg.payload.key === "Undo" || msg.payload.key === "Redo") {
      const cache: DocState = {
        state: msg.payload.eventState || "",
        value: "",
        text: msg.payload.textContent,
        startPosition: msg.payload.startPosition,
        done: true,
        url: _sender.tab.url,
        timestamp: Date.now(),
        type: "Insert",
      };
      currentMap.set(_sender.tab.url, cache);

      const data = {} as UserEventTrace;
      data.eventType = "keystroke";
      data.key = msg.payload.key;
      data.code =msg.payload.key;
      data.eventValue = "";
      data.eventState = msg.payload.eventState;
      data.startPosition = msg.payload.startPosition ? msg.payload.startPosition - 1 : 0;
      data.endPosition = data.startPosition + 1;
      data.url = _sender.tab.url;
      data.timestamp = Date.now();
      data.source = "UserEvent";
      data.author = "human";
      data.textContent = msg.payload.textContent;
      data.tag = msg.payload.tag;
      data.elementType = "insert";

      await traceBuffer.add(data);
    }
    else if (msg.payload.eventValue && msg.payload.eventValue.length === 1) {
      // follow with the input event
      const cache: DocState = {
        state: msg.payload.eventState || "",
        value: msg.payload.eventValue,
        text: msg.payload.textContent,
        startPosition: msg.payload.startPosition,
        done: false,
        url: _sender.tab.url,
        requestId: 0,
        timestamp: Date.now(),
        type: "Insert",
      };
      currentMap.set(_sender.tab.url, cache);
    }
    else {
      const cache: DocState = {
        state: msg.payload.eventState || "",
        value: "",
        text: msg.payload.textContent,
        startPosition: msg.payload.startPosition,
        done: true,
        url: _sender.tab.url,
        timestamp: Date.now(),
        type: "Insert",
      };
      currentMap.set(_sender.tab.url, cache);
    }
  }
  else if (msg.payload.eventType === "input") {
    const pre = currentMap.get(_sender.tab.url);
    if (pre && !pre.done) {
      let value = "";
      let start = pre.startPosition;
      let end = pre.endPosition;
      let type = pre.type; // "insert" or "delete"
      let direction = "forward"; // or "backward"
      if (pre.type === "Backspace") {
        direction = "backward";
        start = pre.startPosition! - 1;
        end = pre.startPosition;
        value = pre.state.slice(start, end);
        type = "delete";
      }
      else if (pre.type === "Delete") {
        start = pre.startPosition;
        end = pre.startPosition! + 1;
        value = pre.state.slice(start, end);
        type = "delete";
      }
      else if (pre.type === "Insert") {
        // insert letter
        // or maybe replacement
        if (pre.state.length >= msg.payload.eventState!.length) {
          type = "delete";
          const diff = pre.state.length - msg.payload.eventState!.length;
          const remove = pre.state.slice(pre.startPosition, pre.startPosition! + diff + 1);
          const remain = pre.state.slice(0, pre.startPosition) + pre.state.slice(pre.startPosition! + diff + 1);

          const data = {} as UserEventTrace;
          data.eventType = "keystroke";
          data.key = remove;
          data.code = remove;
          data.eventValue = remove;
          data.eventState = remain;
          data.startPosition = pre.startPosition;
          data.endPosition = pre.startPosition! + diff + 1;
          data.url = _sender.tab.url;
          data.timestamp = Date.now();
          data.source = "UserEvent";
          data.author = "human";
          data.textContent = pre.text;
          data.tag = msg.payload.tag;
          data.elementType = type;

          await traceBuffer.add(data);
        }

        start = pre.startPosition;
        end = start! + 1;
        value = pre.value;
        type = "insert";
      }

      // add keystroke event
      const data = {} as UserEventTrace;
      data.eventType = "keystroke";
      data.eventState = msg.payload.eventState;
      data.startPosition = start;
      data.key = value;
      data.code = value;
      data.eventValue = value;
      data.endPosition = end;
      data.elementType = type;
      data.url = _sender.tab.url;
      data.timestamp = Date.now();
      data.source = "UserEvent";
      data.author = "human";
      data.textContent = pre.text;
      data.tag = msg.payload.tag;
      data.direction = direction;

      await traceBuffer.add(data);
      pre.state = msg.payload.eventState || "";
      pre.done = true;
      currentMap.set(_sender.tab.url, pre);
    }
  }
  else if (msg.payload.eventType === "paste") {
    if (msg.payload.eventState) {
      const cache: DocState = {
        state: msg.payload.eventState,
        value: "\n",
        text: msg.payload.textContent,
        startPosition: msg.payload.startPosition,
        done: true,
        url: _sender.tab.url,
        timestamp: Date.now(),
        type: "Insert",
      };
      currentMap.set(_sender.tab.url, cache);
    }
  }
  else if (msg.payload.eventType === "cut") {
    if (msg.payload.eventState) {
      const cache: DocState = {
        state: msg.payload.eventState,
        value: msg.payload.eventValue ?? "",
        text: msg.payload.textContent,
        startPosition: msg.payload.startPosition,
        done: true,
        url: _sender.tab.url,
        timestamp: Date.now(),
        type: "Delete",
      };
      currentMap.set(_sender.tab.url, cache);
    }
  }
  // else if (msg.payload.eventType === "pointerdown") {
  // }
  else {
    const pre = currentMap.get(_sender.tab.url);
    if (pre && !pre.done) {
      // add keystroke event
      const data = {} as UserEventTrace;
      data.eventType = "keystroke";
      data.eventState = pre.state;
      data.startPosition = pre.startPosition;
      data.key = pre.value;
      data.code = pre.value;
      data.eventValue = pre.value;
      data.endPosition = pre.endPosition;
      data.elementType = pre.type === "Insert" ? "insert" : "delete";
      data.url = _sender.tab.url;
      data.timestamp = Date.now();
      data.source = "UserEvent";
      data.author = "human";
      data.textContent = pre.text;
      data.tag = msg.payload.tag;

      await traceBuffer.add(data);
      pre.done = true;
      currentMap.set(_sender.tab.url, pre);
    }
  }
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
  onNavigate(url);

  currentMap.set(url, {
    state: "",
    value: "",
    done: true,
    timestamp: Date.now(),
    type: "navigate",
    url: url,
  });

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
  else if (msg.type === "GoogleDocsMeta") {
    onKeyStroke(msg.payload as GoogleDocsMeta);
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
