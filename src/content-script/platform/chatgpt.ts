export function captureChatGPTInteractions() {
  const targetNode = document.body;
  const config = {
    childList: true, // Watch for addition or removal of child nodes
    attributes: true, // Watch for changes to attributes
    subtree: true,   // Watch for changes in descendant nodes
  };

  let lastArticle : null | HTMLElement = null;
  let timeoutId : null | ReturnType<typeof setTimeout> = null;

  const eventFunc = (timestamp: Date) => {
    if (lastArticle) {
      const turn = lastArticle.getAttribute("data-turn");
      const dataTestId = lastArticle.getAttribute("data-testid");
      // console.log(turn === "user" ? "ask" : "answer", timestamp, lastArticle.innerText);

      chrome.runtime.sendMessage({
        type: "trace",
        payload: {
          eventType: "mutation",
          url: window.location.href,
          tagName: "ARTICLE",
          pageType: "AI",
          author: turn === "user" ? "human" : "AI",
          message: lastArticle.innerText,
          eventId: dataTestId,
        }
      });
    }
  };

  const callback = (mutationList: MutationRecord[], observer: MutationObserver) => {
    for (const mutation of mutationList) {
      mutation.addedNodes.forEach((node) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "ARTICLE") {
          eventFunc(new Date());
          lastArticle = node as HTMLElement;
        } else {
          timeoutId = setTimeout(eventFunc, 5000, new Date());
        }
      });
    }
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node
  observer.observe(targetNode, config);
}