import { 
  MessageType,
  UserEventTrace
} from "../shared/types";
import { getXPath } from './xpath';
import { throttle } from './utils';
import { getFormVisibleContainerId } from "../shared/util";

// user-driven events
export const installUserEventTracker = (doc: Document) => {
  doc.addEventListener(
    "pointerdown",
    (event: PointerEvent) => {
      const target = event.target;
      const data = {} as UserEventTrace;
      data.eventType = "pointerdown";

      if (!target || !(target instanceof Element)) return;

      // Native Interactive Elements
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
      }
  });

  doc.addEventListener(
    "change",
    (event) => {
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
      }
    }
  );

  doc.addEventListener(
    "select",
    (event: Event) => {
      const target = event.target;
      if (!target || !(target instanceof Element)) return;
      const data = {} as UserEventTrace;
      data.eventType = "select";

      // Only input and textarea have selection
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
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
        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
      }
      else {
        return;
      }
    }
  );

  doc.addEventListener(
    "mouseup",
    (event: MouseEvent) => {
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

      chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
    }
  );

  doc.addEventListener(
    "scroll",
    throttle(
      (event) => {
        const data = {} as UserEventTrace;
        data.eventType = "scroll";
        
        data.clientX = window.scrollX;
        data.clientY = window.scrollY;
        data.width = window.innerWidth;
        data.height = window.innerHeight;

        data.timestamp = Date.now();

        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
      },
      500,
    )
  );

  doc.addEventListener(
    "wheel",
    throttle(
      (event: WheelEvent) => {
        const data = {} as UserEventTrace;
        data.eventType = "wheel";
        
        data.clientX = window.scrollX;
        data.clientY = window.scrollY;
        data.width = window.innerWidth;
        data.height = window.innerHeight;

        data.timestamp = Date.now();

        chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
      },
      500,
    )
  );

  doc.addEventListener(
    "copy",
    (event: ClipboardEvent) => {
      const selection = doc.getSelection();
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

      chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
    }
  );

  doc.addEventListener(
    "paste",
    (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;
      const pastedData = clipboardData.getData('Text');
    }
  );

  doc.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
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

      chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
    }
  );

  doc.addEventListener("input", (event: Event) => {
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

    chrome.runtime.sendMessage({ type: MessageType.UserEvent, payload: data });
  });

  doc.addEventListener(
    "mouseenter",
    (event) => {
      const target = event.target;
    }
  );

  doc.addEventListener(
    "mouseleave",
    (event) => {
      const target = event.target;
    }
  );

  doc.addEventListener(
    "blur",
    (event) => {
      const target = event.target;
    }
  );
}

export const installNavigationTracker = () => {
  const data = {
    eventType: "navigation",
    url: window.location.href,
    eventTime: new Date().toISOString(),
  };

  chrome.runtime.sendMessage({ type: MessageType.NavigationEvent, payload: data });
}

// Used by different platforms
export const installDomChangeTracker = (
  target: Node,
  config: MutationObserverInit,
  callback: (mutationList: MutationRecord[], observer: MutationObserver) => void
) => {
  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node
  observer.observe(target, config);
};
