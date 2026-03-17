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
  onGeminiMutation,
  onClaudeMutation
} from "./onEvents";

export const pointerDownHandler = (event: PointerEvent) => onPointerDown(event, sender);
export const keyDownHandler = (event: KeyboardEvent) => onKeyDown(event, sender);
export const changeHandler = (event: Event) => onChange(event, sender);
export const copyHandler = (event: ClipboardEvent) => onCopy(event, sender);
export const cutHandler = (event: ClipboardEvent) => onCut(event, sender);
export const pasteHandler = (event: ClipboardEvent) => onPaste(event, sender);
export const inputHandler = (event: Event) => onInput(event, sender);

export const chatgptMutationHandler  = () => {
  let target: HTMLElement | null = null;
  let innerTextCache: string | null = null;

  const func = (node: HTMLElement) => {
    if (target === node && innerTextCache === node.innerText) {
      return;
    }

    onChatgptMutation(node, sender);
    target = node;
    innerTextCache = node.innerText;
  };

  return (mutationList: MutationRecord[], observer: MutationObserver) => {
    for (const mutation of mutationList) {
      if (mutation.type === "characterData") {
        const textNode = mutation.target;
        const node = textNode.parentElement;

        if (!node) return;

        const article = node.closest('article');
        if (article) {
          func(article);
        }
      }

      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          if (node.matches('article')) {
            func(node);
          }
          else {
            let els = node.querySelectorAll('article');
            els.forEach((el) => {
              func(el);
            });
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

export const claudeMutationHandler = () => {
  let target: HTMLElement | null = null;
  let innerTextCache: string | null = null;

  const func = (node: HTMLElement) => {
    if (target === node && innerTextCache === node.innerText) {
      return;
    }
    onClaudeMutation(node, sender);
    target = node;
    innerTextCache = node.innerText;
  };

  return (mutationList: MutationRecord[], observer: MutationObserver) => {
    for (const mutation of mutationList) {
      // // streaming text updates
      if (mutation.type === "characterData" || mutation.type === "attributes") {
        const node = mutation.target;

        if (!(node instanceof HTMLElement)) return;

        let el =
            node.matches('[data-testid="user-message"]')
            ? node as HTMLElement
            : node.querySelector('[data-testid="user-message"]') as HTMLElement | null;

        if (!el) {
          el = node.closest('.font-claude-response') as HTMLElement | null;
        }

        if (el) {
          func(el as HTMLElement);
        }
      }

      // new DOM nodes added
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          let el =
            node.matches('[data-testid="user-message"]')
            ? node
            : node.querySelector('[data-testid="user-message"]');

          if (el) {
            func(el as HTMLElement);
          }
          else {
            const el = node.closest('.font-claude-response');
            if (el) {
              func(el as HTMLElement);
            }
          }
        });
      }
    }
  };
};
