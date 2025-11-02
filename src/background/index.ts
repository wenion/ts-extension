import { now } from "../shared/util";
import { PopupToExtensionEvent } from "../shared/config/eventTypes";
import { supabaseActions } from "./supabase/actions";

let previous = {
  url: "",
  page_type: "",
  author: "",
  container_id: "",
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

let lastMutation = {
  url: "",
  page_type: "",
  author: "",
  container_id: "",
  event_type: "mutation",
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
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("[bg] installed at ", now());
});

const eventHandler = async (
  msg: any,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (!_sender.tab?.id || !_sender.tab?.url) {
    return;
  }

  const trace = {
    // user_id User identifier
    // session_id: Session identifier
    // session_start: Start time after login or period of inactivity
    // session_end: End time after period of inactivity or logout

    url: msg.payload.url?? _sender.tab.url, //The base URL or page where the event happened (e.g., https://example.com/lesson1).
    page_type: msg.payload.pageType, // Kind of URL (AI; editor; other)
    author: msg.payload.author, // Subject or doer of the event human; AI; other
    container_id: msg.payload.containerId,  // Identifier for the text field. Needed for when a page has multiple text fields (e.g., a form).

    event_type: msg.payload.eventType, // Type interface event
    message: msg.payload.message, // Full text content of prompt sent to AI; full text content of AI response
    cursor_position: msg.payload.cursorPosition, // Position of cursor in text container

    event_time: new Date().toISOString(), // Time of event
    event_value: msg.payload.eventValue, // Most recently typed content in text field
    event_id: msg.payload.eventId, // Identifier for the event
    event_state: msg.payload.eventState, // Accumulated typed content

    tag_name: msg.payload.tag, // The HTML tag where the event occurred
    element_text: msg.payload.elementText, //The visible text of the element the user interacted with (e.g., button label or link text).
    offset_x: msg.payload.clientX, // X-coordinate offset (relative to the viewport) where the event occurred.
    offset_y: msg.payload.clientY, // Y-coordinate offset (relative to the viewport) where the event occurred.
    x_path: msg.payload.xpath, // The full XPath of the DOM element, useful for uniquely identifying the element interacted with.
    width: msg.payload.width, // The width of the viewport (in pixels)
    height: msg.payload.height, // The height of the viewport (in pixels)
  }

  // if previous event is keydown and current input
  if (
    previous.event_type === "keydown" &&
    trace.event_type === "input" &&
    previous.x_path === trace.x_path &&
    previous.event_value === trace.event_value
  ) {
    previous.event_state = trace.event_state;
    await supabaseActions.insert('Trace', previous);
  }

  if (trace.event_type === "mutation") {
    if (trace.message === lastMutation.message) {
      return;
    }
    await supabaseActions.insert('Trace', trace);
    lastMutation = trace;
  }

  if (trace.event_type === "assistwriting") {
    await supabaseActions.insert('Trace', trace);
  }

  previous = trace;
}

chrome.runtime.onMessage.addListener(async(msg, _sender, sendResponse) => {
  if (msg.type === PopupToExtensionEvent.USER_LOGIN) {
    const session = msg.payload;
    const currentSession = await chrome.storage.sync.get("session");
    if (currentSession.session?.access_token !== session.access_token) {
      chrome.storage.sync.set({session});
      await supabaseActions.updateSession(session);
    }
  }
  else if (msg.type === PopupToExtensionEvent.USER_LOGOUT) {
    console.log("[bg] LOGOUT", msg.payload);
    chrome.storage.sync.remove("session");
  }
  else if (msg.type === "trace") {
    eventHandler(msg, _sender, sendResponse);
  }
  return true; // keep channel open for async
});
