export const MessageType = {
  UserEvent: "UserEvent",
  NavigationEvent: "NavigationEvent",
  DOMMutationEvent: "DOMMutationEvent",
  ApiEvent: "ApiEvent",
  LoginEvent: "LoginEvent",
  LogoutEvent: "LogoutEvent",
} as const;

export type MessageType = keyof typeof MessageType;

export const Source = {
  CHATGPT: "chatgpt",
  GOOGLE_DOCS: "google_docs",
} as const;

export type Source =
  typeof Source[keyof typeof Source];

export type Profile ={
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  updated_at: string;
};

// User Event Trace type
export type UserEventTrace = {
  eventType: string;
  tag: string;
  subType?: string; // target.type
  name: string;
  placeholder: string;
  innerText: string;
  textContent: string;
  //clientX: selectionStart for input[select event]
  //clientX: scrollX for scroll and wheel
  clientX: number;
  //selectionEnd for input[select event]
  //scrollY for scroll and wheel
  clientY: number;
  width: number;
  height: number;
  xpath: string;

  valueName: string; // for input change
  originValue: any; // avoid circular structure
  valueType: string; // typeof value
  // for select element
  valueIndex: number;
  valueLabel: string;

  // "backward"/"forward" for select event and selection
  direction: string;

  label: string;
  timestamp: number;

  code: string; // for keyboard event
  key: string; // for keyboard event
  altKey: boolean; // for keyboard event
  ctrlKey: boolean; // for keyboard event
  metaKey: boolean; // for keyboard event
  shiftKey: boolean; // for keyboard event

  message?: string;
  eventValue?: string;
  eventState?: string;
  eventId?: string;
  cursorPosition?: number;

  pageType?: string;
  author?: string;
  containerId?: number;
};

// DOM Mutation Event Trace type
export type DOMMutationEventTrace = {
  eventType: string;
  url: string;
  tag: string;
  pageType?: string;
  author: string;
  message: string;
  eventId: string;
  eventTime: string;
};

// API Event Trace type
export type ApiEventTrace = {
  eventType: string;
  subType?: string;
  method: string;
  url: string;
  pageType: string;
  author: string;
  eventId: string;
  source: string;
  eventValue?: string;
  eventState?: string;
  startPosition?: number;
  endPosition?: number;
  sessionId?: string;
  eventTime: string;
};

// Database Trace record type
export type TraceRecord = {
  /**
   * url
   * The base URL or page where the event happened.
   * Example: "https://example.com/editor"
   */
  url: string;

  /**
   * page_type
   * Kind of URL
   * Example values: "AI", "editor", "other"
   */
  page_type: string | null;

  /**
   * author
   * Subject or doer of the event
   * Example values: "human", "AI", "other"
   */
  author: string | null;

  /**
   * container_id
   * Identifier for the text field. Needed for when a page has multiple text fields (e.g., a form).
   */
  container_id: number | null;

  /**
   * event_type
   * Type interface event
   * Example values: "insert", "delete", "select(text)", "copy", "paste", "cursor-forward",
   * "cursor-backward", "click (element)", "scroll", "mouseenter", "mouseleave", "blur"
   */
  event_type: string | null;

  /**
   * message
   * Full text content of prompt sent to AI; full text content of AI response
   */
  message: string | null;

  /**
   * cursor_position
   * Position of cursor in text container
   */
  cursor_position: number | null;

  /**
   * end_position
   * Position of final cursor in text container
   */
  end_position: number | null;

  /**
   * event_time
   * Time of event
   * Number of milliseconds since Unix epoch /timestamp with time zone (ISO string)
   */
  event_time: string | null;

  /**
   * event_value
   * Most recently typed content in text field
   */
  event_value: string | null;

  /**
   * event_id
   * Identifier for the event
   */
  event_id: string | null;

  /**
   * event_state
   * Accumulated typed content
   */
  event_state: string | null;

  /**
   * The HTML tag where the event occurred
   */
  tag_name: string | null;

  /**
   * element_text
   * The visible text of the element the user interacted with (e.g., button label or link text).
   */
  element_text: string | null;

  /**
   * offset_x
   * X-coordinate offset (relative to the viewport) where the event occurred.
   */
  offset_x: number | null;

  /**
   * Y-coordinate offset (relative to the viewport) where the event occurred.
   */
  offset_y: number | null;

  /**
   * width
   * The width of the viewport (in pixels)
   */
  width: number | null;

  /**
   * height
   * The height of the viewport (in pixels)
   */
  height: number | null;

  /**
   * x_path
   * The full XPath of the DOM element, useful for uniquely identifying the element interacted with.
   */
  x_path: string | null;
};
