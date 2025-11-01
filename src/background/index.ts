import { now } from "../shared/util";
import { PopupToExtensionEvent } from "../shared/config/eventTypes";
import { supabaseActions } from "./supabase/actions";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[bg] installed at ", now());
});

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
    if (!_sender.tab?.id || !_sender.tab?.url) {
      return;
    }
    console.log("[bg] trace event:",
      "eventType:", msg.payload.eventType,
      "eventValue:", msg.payload.eventValue,
      "eventState:", msg.payload.eventState,
      "elementText:", msg.payload.elementText,
      "cursorPosition:", msg.payload.cursorPosition,
      "tag:", msg.payload.tag,
      "url:", msg.payload.url,
    )

    await supabaseActions.insert('Trace', {
      // user_id User identifier
      // session_id: Session identifier
      // session_start: Start time after login or period of inactivity
      // session_end: End time after period of inactivity or logout

      url: msg.payload.url, //The base URL or page where the event happened (e.g., https://example.com/lesson1).
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
    });
  }
  return true; // keep channel open for async
});
