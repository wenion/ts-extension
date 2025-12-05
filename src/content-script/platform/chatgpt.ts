import { MessageType } from "../../shared/types";

// config for MutationObserver
export const chatgptMutationConfig = {
  childList: true, // Watch for addition or removal of child nodes
  attributes: true, // Watch for changes to attributes
  subtree: true,   // Watch for changes in descendant nodes
};

let lastArticle : null | HTMLElement = null;
let timeoutId : null | ReturnType<typeof setTimeout> = null;

// Emit trace event for a ChatGPT ARTICLE element
const emitChatgptMutationTrace = (timestamp: Date) => {
  if (lastArticle) {
    const turn = lastArticle.getAttribute("data-turn");
    const dataTestId = lastArticle.getAttribute("data-testid");

    chrome.runtime.sendMessage({
      type: MessageType.DOMMutationEvent,
      payload: {
        eventType: "chatgpt",
        url: window.location.href,
        tag: "ARTICLE",
        pageType: "AI",
        author: turn === "user" ? "human" : "AI",
        message: lastArticle.innerText,
        eventId: dataTestId,
        eventTime: timestamp.toISOString(),
      }
    });
  }
};

// Process individual added nodes
const processChatgptMutation = (node: Node) => {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "ARTICLE") {
    emitChatgptMutationTrace(new Date());
    lastArticle = node as HTMLElement;
  } else {
    timeoutId = setTimeout(emitChatgptMutationTrace, 5000, new Date());
  }
}

// MutationObserver callback
export const handleChatgptMutations = (
  mutationList: MutationRecord[],
  observer: MutationObserver
) => {
  for (const mutation of mutationList) {
    mutation.addedNodes.forEach((node) => {
      processChatgptMutation(node);
    });
  }
};
