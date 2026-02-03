import {
  userEventSender as sender,
  onPointerDown,
  onKeyDown,
  onChange,
  onInput,
  onCut,
  onCopy,
  onPaste,
  onChatgptMutation,
  onGeminiMutation
} from "./onEvents";

export const pointerDownHandler = (event: PointerEvent) => onPointerDown(event, sender);
export const keyDownHandler = (event: KeyboardEvent) => onKeyDown(event, sender);
export const changeHandler = (event: Event) => onChange(event, sender);
export const copyHandler = (event: ClipboardEvent) => onCopy(event, sender);
export const cutHandler = (event: ClipboardEvent) => onCut(event, sender);
export const pasteHandler = (event: ClipboardEvent) => onPaste(event, sender);
export const inputHandler = (event: Event) => onInput(event, sender);

export const chatgptMutationHandler  = (
  delay: number = 10000
) => {
  let target: HTMLElement | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const func = (node: HTMLElement) => {
    return onChatgptMutation(node, sender);
  };

  return (mutationList: MutationRecord[], observer: MutationObserver) => {
    for (const mutation of mutationList) {
      if (mutation.type === "characterData") {
        if (target && target.contains(mutation.target)) {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(func, delay, target);
        }
      }

      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLElement &&
            node.tagName === "ARTICLE"
          ) {
            if (target) {
              func(target);
            }
            target = node;
          }
        });
      }
    }
  }
};

export const geminiMutationHandler  = (
  delay: number = 10000
) => {
  let target: HTMLElement | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const func = (node: HTMLElement) => {
    return onGeminiMutation(node, sender);
  };

  return (mutationList: MutationRecord[], observer: MutationObserver) => {
    for (const mutation of mutationList) {
      if (mutation.type === "characterData" || mutation.type === "attributes") {
        if (target && target.contains(mutation.target)) {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(func, delay, target);
        }
      }

      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLElement &&
            (node.tagName === "USER-QUERY" ||
              node.tagName === "MODEL-RESPONSE")
          ) {
            if (target) {
              func(target);
            }
            target = node;
          }
        });
      }
    }
  }
};
