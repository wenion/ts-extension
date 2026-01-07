import type { UserEventTrace, DOMMutationEventTrace } from "../shared/types";
import { MessageType } from "../shared/types";
import { getXPath } from './xpath';
import { getFormVisibleContainerId } from "../shared/util";

export const userEventSender = (trace: UserEventTrace) => {
  chrome.runtime.sendMessage({
    type: MessageType.UserEvent,
    payload: trace
  });
}

export const onPointerDown = (
  event: PointerEvent,
  func?: (trace: UserEventTrace) => void
) : void => {
  const target = event.target;
  const data = {} as UserEventTrace;
  data.eventType = "pointerdown";

  if (!target || !(target instanceof Element)) return;

  if (target instanceof HTMLInputElement) {
    const subType = target.type.toLowerCase();
    data.subType = subType;
    data.tag = target.tagName.toLowerCase();
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.innerText = target.innerText;
    data.textContent = target.textContent || "";
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    let originValue: string | number | boolean = target.value;
    if (subType === "checkbox" || subType === "radio") {
      data.originValue = target.checked;
      data.valueName = "checked";
    } else if (subType === "file") {
      data.originValue = target.files?.length || 0;
      data.valueName = "files";
    } else if (subType === "range" || subType === "number") {
      data.originValue = target.valueAsNumber;
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
    const subType = target.type.toLowerCase();
    data.subType = subType;
    data.tag = target.tagName.toLowerCase();
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.innerText = target.innerText;
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
    const subType = target.type.toLowerCase();
    data.subType = subType;
    data.tag = target.tagName.toLowerCase();
    data.name = target.name;
    data.innerText = target.innerText;
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
    const subType = target.type.toLowerCase();
    data.subType = subType;
    data.tag = target.tagName.toLowerCase();
    data.name = target.name;
    data.innerText = target.innerText;
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
    const subType = target.type.toLowerCase();
    data.subType = subType;
    data.tag = target.tagName.toLowerCase();
    data.name = "";
    data.innerText = target.innerText;
    data.textContent = target.textContent || "";
    data.clientX = event.clientX;
    data.clientY = event.clientY;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    data.originValue = target.href;
    data.valueName = "href";
    data.valueType = typeof data.originValue;

    data.label = "";
  }
  else if (target instanceof HTMLDivElement) {
    data.tag = target.tagName.toLowerCase();
    data.subType = "";
    data.name = (target as any).name || "";
    data.innerText = target.innerText;
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
  else if (target instanceof Element) {
    data.tag = target.tagName.toLowerCase();
    data.subType = "";

    data.name = (target as any).name || "";
    data.innerText = "";
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
  data.eventType = "change";

  if (!target || !(target instanceof HTMLElement)) return;

  data.containerId = getFormVisibleContainerId(target);

  if (target instanceof HTMLInputElement) {
    const subType = target.type.toLowerCase();
    data.subType = subType;
    data.tag = target.tagName.toLowerCase();
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.innerText = target.innerText;
    data.textContent = target.textContent || "";
    data.clientX = 0;
    data.clientY = 0;
    data.width = window.innerWidth;
    data.height = window.innerHeight;
    data.xpath = getXPath(target);

    if (subType === "checkbox" || subType === "radio") {
      data.originValue = target.checked;
      data.valueName = "checked";
    } else if (subType === "file") {
      data.originValue = target.files?.length || 0;
      data.valueName = "files";
    } else if (subType === "range" || subType === "number") {
      data.originValue = target.valueAsNumber;
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
    const subType = target.type.toLowerCase();
    data.subType = subType;
    data.tag = target.tagName.toLowerCase();
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.innerText = target.innerText;
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
    const subType = target.type.toLowerCase();
    data.subType = subType;
    data.tag = target.tagName.toLowerCase();
    data.name = target.name;
    data.innerText = target.innerText;
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
    data.tag = target.tagName.toLowerCase();
    data.subType = "";
    data.name = (target as any).name || "";
    data.innerText = "";
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
    data.label = "";
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
  data.eventType = "select";

  if (target instanceof HTMLInputElement ) {
    if (target.selectionStart === null || target.selectionEnd === null) return;

    data.subType = target.type.toLowerCase();
    data.tag = target.tagName.toLowerCase();
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.innerText = target.innerText;
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
  else if (target instanceof HTMLTextAreaElement ) {
    if (target.selectionStart === null || target.selectionEnd === null) return;

    data.subType = target.type.toLowerCase();
    data.tag = target.tagName.toLowerCase();
    data.name = target.name;
    data.placeholder = target.placeholder;
    data.innerText = target.innerText;
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
  data.eventType = "mouseup";
  data.subType = "";
  data.tag = target.tagName.toLowerCase();
  data.name = (target as any).name || "";
  data.innerText = "";
  data.textContent = target.textContent || "";
  data.clientX = event.clientX;
  data.clientY = event.clientY;
  data.width = window.innerWidth;
  data.height = window.innerHeight;
  data.xpath = getXPath(target);

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
  const data = {} as UserEventTrace;
  data.eventType = "keydown";

  if (
    !target ||
    !(
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    )
  ) return;

  data.tag = (target as Element).tagName?.toLowerCase() || "";
  data.name = (target as any).name || "";
  data.innerText = "";
  data.textContent = (target as Element).textContent || "";
  data.clientX = NaN;
  data.clientY = NaN;
  data.width = window.innerWidth;
  data.height = window.innerHeight;
  data.xpath = target instanceof Element ? getXPath(target) : "";

  data.code = event.code;
  data.key = event.key;
  data.altKey = event.altKey;
  data.ctrlKey = event.ctrlKey;
  data.metaKey = event.metaKey;
  data.shiftKey = event.shiftKey;

  data.timestamp = Date.now();

  data.eventValue = data.key;
  data.eventState = data.textContent;

  data.pageType = "AI";
  data.author = "human";

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    // data.eventState = target.value;
    data.cursorPosition = target.selectionStart ?? undefined;
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
      data.cursorPosition = pos === null ? undefined : pos;
    }
  }

  func && func(data);
}

export const onInput = (
  event: Event,
  func?: (trace: UserEventTrace) => void
) : void => {
  const target = event.target;
  const data = {} as UserEventTrace;
  data.eventType = "input";

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    data.eventState = target.value;
    data.cursorPosition = target.selectionStart ?? undefined;
    data.textContent = target.textContent || "";
    data.eventValue = (event as InputEvent).data ?? "";
    data.eventState = data.textContent;
    data.timestamp = Date.now();
    data.xpath = getXPath(target as Element);
    data.tag = (target as Element).tagName?.toLowerCase() || "";
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    data.eventState = target.innerText;
    data.eventValue = (event as InputEvent).data ?? "";

    data.xpath = getXPath(target as Element);
    data.tag = (target as Element).tagName?.toLowerCase() || "";
  }

  func && func(data);
}

export const onScroll = (
  event: Event,
  func?: (trace: UserEventTrace) => void
) : void => {
  const data = {} as UserEventTrace;
  data.eventType = "scroll";
  
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
  data.eventType = "scroll";
  
  data.clientX = window.scrollX;
  data.clientY = window.scrollY;
  data.width = window.innerWidth;
  data.height = window.innerHeight;

  data.timestamp = Date.now();
  func && func(data);
};

export const onCopy = (
  event: ClipboardEvent,
  func?: (trace: UserEventTrace) => void
) : void => {
  const selection = document.getSelection();
  if (!selection) return;
  const data = {} as UserEventTrace;
  data.eventType = "copy";
  data.subType = "";
  data.tag = "";
  data.name = "";
  data.innerText = "";
  data.textContent = selection.toString();
  data.clientX = 0;
  data.clientY = 0;
  data.width = window.innerWidth;
  data.height = window.innerHeight;
  data.xpath = "";
  data.eventState = selection.toString();
  data.message = selection.toString();

  func && func(data);
};

export const mutationEventSender = (trace: DOMMutationEventTrace) => {
  chrome.runtime.sendMessage({
    type: MessageType.DOMMutationEvent,
    payload: trace
  });
};

const onMutation = (
  node: HTMLElement,
  builder: (node: HTMLElement) => DOMMutationEventTrace,
  func?: (trace: DOMMutationEventTrace) => void
) => {
  const data = builder(node);
  func && func(data);
};

export const onChatgptMutation = (
  node: HTMLElement,
  sender: (trace: DOMMutationEventTrace) => void
) => {
  const builder = (node: HTMLElement) => {
    const data = {} as DOMMutationEventTrace;
    data.eventType = "chatgpt";
    data.url = window.location.href;
    data.tag = "ARTICLE";
    data.pageType = "AI";
    data.author = node.getAttribute("data-turn") === "user" ? "human" : "AI";
    data.message = node.innerText;
    data.eventId = node.getAttribute("data-testid") || "";
    data.eventTime = new Date().toISOString();
    return data;
  };
  onMutation(node, builder, sender);
}
