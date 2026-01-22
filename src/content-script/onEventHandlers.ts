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
} from "./onEvents";

export const pointerDownHandler = (event: PointerEvent) => onPointerDown(event, sender);
export const keyDownHandler = (event: KeyboardEvent) => onKeyDown(event, sender);
export const changeHandler = (event: Event) => onChange(event, sender);
export const copyHandler = (event: ClipboardEvent) => onCopy(event, sender);
export const cutHandler = (event: ClipboardEvent) => onCut(event, sender);
export const pasteHandler = (event: ClipboardEvent) => onPaste(event, sender);
export const inputHandler = (event: Event) => onInput(event, sender);

export const chatgptMutationHandler  = (
  delay: number = 5000
) => {
  let target: HTMLElement | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const func = (node: HTMLElement) => {
    return onChatgptMutation(node, sender);
  };

  return (mutationList: MutationRecord[], observer: MutationObserver) => {
    for (const mutation of mutationList) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.tagName === "ARTICLE") {
          if (target) {
            func(target);
          }
          target = node;
        }
      });
      if (mutation.type === "characterData") {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (target) {
          timeoutId = setTimeout(func, delay, target);
        }
      }
    }
  }
};
