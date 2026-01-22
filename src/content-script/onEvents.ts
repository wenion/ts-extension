import type { UserEventTrace } from "../shared/types";
import { getXPath } from './xpath';
import { getFormVisibleContainerId } from "../shared/util";

export const userEventSender = (trace: UserEventTrace) => {
  chrome.runtime.sendMessage({
    type: "UserEvent",
    payload: trace
  });
}

export const onPointerDown = (
  event: PointerEvent,
  func?: (trace: UserEventTrace) => void
) : void => {
  const target = event.target;
  const data = {} as UserEventTrace;
  data.source = "UserEvent";
  data.eventType = event.type;
  data.timestamp = Date.now();

  if (!target || !(target instanceof Element)) return;

  if (target instanceof HTMLInputElement) {
    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.textContent = target.textContent || "";
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    let originValue: string | number | boolean = target.value;
    if (data.elementType === "checkbox" || data.elementType === "radio") {
      data.originValue = target.checked.toString();
      data.valueName = "checked";
    } else if (data.elementType === "file") {
      data.originValue = (target.files?.length || 0).toString();
      data.valueName = "files";
    } else if (data.elementType === "range" || data.elementType === "number") {
      data.originValue = target.valueAsNumber.toString();
      data.valueName = "valueAsNumber";
    } else {
      data.originValue = target.value;
      data.valueName = "value";
    }
    // else if (subType === "button" || subType === "submit" || subType === "reset") {
    //   originValue = target.value;

    // } else if (subType === "date" || subType === "time" || subType === "datetime-local" || subType === "month" || subType === "week") {
    //   originValue = target.value;

    // }
    data.valueType = typeof originValue;
    if (target.labels?.length) {
      data.label = Array.from(target.labels).map(l => l.textContent).join(" | ");
    }
  }
  else if (target instanceof HTMLTextAreaElement) {
    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.textContent = target.textContent || "";
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    data.originValue = target.value;
    data.valueName = "value";
    data.valueType = "string";

    if (target.labels?.length) {
      data.label = Array.from(target.labels).map(l => l.textContent).join(" | ");
    }
  }
  else if (target instanceof HTMLSelectElement) {
    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = target.name;
    data.textContent = target.textContent || "";
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    data.originValue = target.value;;
    data.valueName = "value";
    data.valueType = typeof data.originValue;

    data.valueIndex = target.selectedIndex;
    data.valueLabel = target.selectedOptions[0]?.label || "";

    if (target.labels?.length) {
      data.label = Array.from(target.labels).map(l => l.textContent).join(" | ");
    }
  }
  else if (target instanceof HTMLButtonElement) {
    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = target.name;
    data.textContent = target.textContent || "";
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    data.originValue = target.value;
    data.valueName = "value";
    data.valueType = typeof data.originValue;

    if (target.labels?.length) {
      data.label = Array.from(target.labels).map(l => l.textContent).join(" | ");
    }
  }
  else if (target instanceof HTMLAnchorElement) {
    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = "";
    data.textContent = target.textContent || "";
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    data.originValue = target.href;
    data.valueName = "href";
    data.valueType = typeof data.originValue;

    data.label = target.innerText || "";
  }
  else if (target instanceof HTMLDivElement) {
    data.tag = target.tagName;

    data.name = (target as any).name || "";
    data.textContent = target.textContent || "";
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);
    data.originValue = "";
    data.valueName = "";
    data.valueType = "";
    data.label = target.innerText || "";
  }
  else if (target instanceof Element) {
    data.tag = target.tagName;

    data.name = (target as any).name || "";
    data.textContent = target.textContent || "";
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);
    data.originValue = "";
    data.valueName = "";
    data.valueType = "";
    data.label = "";
  }
  else {
    return;
  }
  func && func(data);
};

export const onChange = (
  event: Event,
  func?: (trace: UserEventTrace) => void
) : void => {
  const target = event.target;
  const data = {} as UserEventTrace;
  data.eventType = event.type;
  data.source = "UserEvent";
  data.timestamp = Date.now();

  if (!target || !(target instanceof HTMLElement)) return;

  data.containerId = getFormVisibleContainerId(target);

  if (target instanceof HTMLInputElement) {
    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.textContent = target.textContent || "";
    data.clientX = 0;
    data.clientY = 0;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    if (data.elementType === "checkbox" || data.elementType === "radio") {
      data.originValue = target.checked.toString();
      data.valueName = "checked";
    } else if (data.elementType === "file") {
      data.originValue = (target.files?.length || 0).toString();
      data.valueName = "files";
    } else if (data.elementType === "range" || data.elementType === "number") {
      data.originValue = target.valueAsNumber.toString();
      data.valueName = "valueAsNumber";
    } else {
      data.originValue = target.value;
      data.valueName = "value";
    }

    data.valueType = typeof data.originValue;
    if (target.labels?.length) {
      data.label = Array.from(target.labels).map(l => l.textContent).join(" | ");
    }
  }
  else if (target instanceof HTMLTextAreaElement) {
    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.textContent = target.textContent || "";
    data.clientX = NaN;
    data.clientY = NaN;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    data.originValue = target.value;
    data.valueName = "value";
    data.valueType = "string";

    if (target.labels?.length) {
      data.label = Array.from(target.labels).map(l => l.textContent).join(" | ");
    }
  }
  else if (target instanceof HTMLSelectElement) {
    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = target.name;
    data.textContent = target.textContent || "";

    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    data.valueName = "value";
    data.originValue = target.value;
    data.valueType = typeof data.originValue;

    data.valueIndex = target.selectedIndex;
    data.valueLabel = target.selectedOptions[0]?.label || "";

    if (target.labels?.length) {
      data.label = Array.from(target.labels).map(l => l.textContent).join(" | ");
    }
  }
  else if (target instanceof Element) {
    data.tag = target.tagName;
    data.name = (target as any).name || "";
    data.textContent = target.textContent || "";
    data.clientX = NaN;
    data.clientY = NaN;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);
    data.originValue = "";
    data.valueName = "";
    data.valueType = "";
    data.valueIndex = NaN;
    data.valueLabel = "";
    data.direction = "";
    data.label = target.innerText || "";
  }

  func && func(data);
}

export const onSelect = (
  event: Event,
  func?: (trace: UserEventTrace) => void
) : void => {
  const target = event.target;
  if (!target || !(target instanceof Element)) return;
  const data = {} as UserEventTrace;
  data.source = "UserEvent";
  data.eventType = event.type;
  data.timestamp = Date.now();

  if (target instanceof HTMLInputElement ) {
    if (target.selectionStart === null || target.selectionEnd === null) return;

    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.textContent = target.textContent || "";
    data.clientX = target.selectionStart;
    data.clientY = target.selectionEnd;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    data.originValue = target.value.substring(target.selectionStart, target.selectionEnd);
    data.valueName = "value";
    data.valueType = "string";
    data.direction = target.selectionDirection || "";

    if (target.labels?.length) {
      data.label = Array.from(target.labels).map(l => l.textContent).join(" | ");
    }
  }
  else if (target instanceof HTMLTextAreaElement) {
    if (target.selectionStart === null || target.selectionEnd === null) return;

    data.tag = target.tagName;
    data.elementType = target.type;
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.textContent = target.textContent || "";
    data.clientX = target.selectionStart;
    data.clientY = target.selectionEnd;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    data.originValue = target.value.substring(target.selectionStart, target.selectionEnd);
    data.valueName = "value";
    data.valueType = "string";
    data.direction = target.selectionDirection || "";

    if (target.labels?.length) {
      data.label = Array.from(target.labels).map(l => l.textContent).join(" | ");
    }
  }
  else {
    return;
  }
  func && func(data);
};

export const onMouseUp = (
  event: MouseEvent,
  func?: (trace: UserEventTrace) => void
) : void => {
  const target = event.target;
  if (!target || !(target instanceof Element)) return;

  const selection = document.getSelection();
  if (!selection) return;

  const data = {} as UserEventTrace;
  data.source = "UserEvent";
  data.eventType = event.type;
  if ("type" in target && typeof (target as any).type === "string") {
    data.elementType = (target as any).type;
  }
  data.tag = target.tagName;
  data.name = (target as any).name || "";
  data.textContent = target.textContent || "";
  data.clientX = event.clientX;
  data.clientY = event.clientY;
  data.width = window.innerWidth;
  data.height = window.innerHeight;
  data.xpath = getXPath(target);
  data.timestamp = Date.now();

  data.originValue = selection.toString();
  data.valueName = "";
  data.valueType = "string";
  data.label = "";
  data.direction = selection.direction || "";

  func && func(data);
};

export const onKeyDown = (
  event: KeyboardEvent,
  func?: (trace: UserEventTrace) => void
) : void => {
  const target = event.target;

  if (!target) return;

  const isNativeInput =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement;

  const isInContentEditable =
    (target as HTMLElement).isContentEditable;

  if (!isNativeInput && !isInContentEditable) return;

  const MODIFIER_KEYS = new Set([
    "Shift",
    "Control",
    "Alt",
    "Meta",
    "CapsLock"
  ]);

  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    MODIFIER_KEYS.has(event.key)
  ) {
    return;
  }

  const data = {} as UserEventTrace;
  data.eventType = event.type;
  data.source = "UserEvent";

  data.tag = (target as Element).tagName || "";
  data.name = (target as any).name || "";
  data.textContent = (target as Element).textContent || "";
  data.clientX = NaN;
  data.clientY = NaN;
  data.width = window.innerWidth;
  data.height = window.innerHeight;
  data.xpath = target instanceof Element ? getXPath(target) : "";

  data.code = event.code;
  data.key = event.key;
  data.timestamp = Date.now();

  // TODO escape characters eventValue should be null for non-character keys
  data.eventValue = data.key;
  data.eventState = data.textContent;

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    // data.eventState = target.value;
    data.startPosition = target.selectionStart ?? undefined;
  } else {
    function getCaretPositionInContentEditable(el: HTMLElement): number | null {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);
      const preRange = range.cloneRange();
      preRange.selectNodeContents(el);
      preRange.setEnd(range.endContainer, range.endOffset);
      return preRange.toString().length; // number of characters before caret
    }
    if (target instanceof HTMLElement && target.isContentEditable) {
      // data.eventState = target.innerText;
      const pos = getCaretPositionInContentEditable(target);
      data.startPosition = pos === null ? undefined : pos;
    }
  }

  func?.(data);
}

export const onInput = (
  event: Event,
  func?: (trace: UserEventTrace) => void
) : void => {
  if (!(event instanceof InputEvent)) return;

  const target = event.target;
  const data = {} as UserEventTrace;
  data.source = "UserEvent";
  data.eventType = event.type;
  data.timestamp = Date.now();

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    data.startPosition = target.selectionStart ?? undefined;
    data.textContent = target.textContent;
    data.eventValue = event.data ?? "";
    data.eventState = target.innerText;
    data.xpath = getXPath(target as Element);
    data.tag = target.tagName;
  }
  else if (target instanceof HTMLElement && target.isContentEditable) {
    data.eventState = target.innerText;
    data.eventValue = event.data ?? "";
    data.xpath = getXPath(target as Element);
    data.tag = target.tagName;
  }

  func?.(data);
}

export const onScroll = (
  event: Event,
  func?: (trace: UserEventTrace) => void
) : void => {
  const data = {} as UserEventTrace;
  data.eventType = event.type;
  data.source = "UserEvent";
  
  data.clientX = window.scrollX;
  data.clientY = window.scrollY;
  data.width = window.innerWidth;
  data.height = window.innerHeight;

  data.timestamp = Date.now();
  func && func(data);
};

export const onWheel = (
  event: WheelEvent,
  func?: (trace: UserEventTrace) => void
) : void => {
  const data = {} as UserEventTrace;
  data.eventType = event.type;
  data.source = "UserEvent";
  
  data.clientX = window.scrollX;
  data.clientY = window.scrollY;
  data.width = window.innerWidth;
  data.height = window.innerHeight;

  data.timestamp = Date.now();
  func && func(data);
};

export const onCut = (
  event: ClipboardEvent,
  func?: (trace: UserEventTrace) => void
): void => {
  let text = "";

  const target = event.target as HTMLElement | null;

  // Case 1: input / textarea
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    text = target.value.slice(start, end);
  }
  // Case 2: contenteditable or normal DOM selection
  else {
    text = document.getSelection()?.toString() ?? "";
  }

  const data = {} as UserEventTrace;
  data.source = "UserEvent";
  data.eventType = event.type;
  data.textContent = text;
  data.eventState = text;
  data.timestamp = Date.now();

  if (target) {
    data.tag = target.tagName;

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      // data.innerText = target.value;
      data.name = target.name ?? "";
      data.placeholder = target.placeholder ?? "";
    } else {
      // data.innerText = target.innerText ?? "";
      data.name = "";
      data.placeholder = "";
    }
  }

  func?.(data);
};

export const onCopy = (
  event: ClipboardEvent,
  func?: (trace: UserEventTrace) => void
) : void => {
  const clipboardText = event.clipboardData?.getData("text/plain") ?? "";

  const data = {} as UserEventTrace;
  data.source = "UserEvent";
  data.eventType = event.type;
  data.textContent = clipboardText;
  data.eventState = clipboardText;
  data.timestamp = Date.now();

  const selection = document.getSelection();
  const selectedText = selection ? selection.toString() : "";

  const target = event.target as HTMLElement | null;
  if (target) {
    data.tag = target.tagName;
    data.name = (target as HTMLInputElement).name ?? "";
    data.placeholder = (target as HTMLInputElement).placeholder ?? "";
  }

  if (selectedText !== clipboardText && clipboardText.length < selectedText.length) {
    data.textContent = selectedText;
    data.eventState = selectedText;
  }

  func?.(data);
};

export const onPaste = (
  event: ClipboardEvent,
  func?: (trace: UserEventTrace) => void
) : void => {
  const clipboardText =
    event.clipboardData?.getData("text/plain") ?? "";

  const data = {} as UserEventTrace;
  data.source = "UserEvent";
  data.eventType = event.type;
  data.textContent = clipboardText;
  data.eventState = clipboardText;
  data.timestamp = Date.now();

  const target = event.target as HTMLElement | null;
  if (target) {
    data.tag = target.tagName;

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      data.name = (target as HTMLInputElement).name ?? "";
      data.placeholder = (target as HTMLInputElement).placeholder ?? "";
      data.startPosition = target.selectionStart ?? undefined;
      data.originValue = target.value;
      data.valueType = typeof target.value;
    }
    else {
      data.originValue = target.textContent ?? "";
    }
  }

  func?.(data);
};

const onMutation = (
  node: HTMLElement,
  builder: (node: HTMLElement) => UserEventTrace,
  func?: (trace: UserEventTrace) => void
) => {
  const data = builder(node);
  func?.(data);
};

export const onChatgptMutation = (
  node: HTMLElement,
  sender: (trace: UserEventTrace) => void
) => {
  const builder = (node: HTMLElement) => {
    const data = {} as UserEventTrace;
    data.eventType = "mutation";
    data.url = window.location.href;
    data.tag = node.tagName;
    data.author = node.getAttribute("data-turn") === "user" ? "human" : "AI";
    data.message = node.innerText;
    data.sessionId = node.getAttribute("data-testid") || "";
    data.timestamp = Date.now();
    data.source = "Mutation";
    return data;
  };
  onMutation(node, builder, sender);
};
