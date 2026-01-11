import { now } from "../shared/util";
import { addMutationEventListener, removeMutationEventListener } from "./mutationObserver";
import {
  addGoogleDocsEventListener,
  removeGoogleDocsEventListener,
  googleDocsHandler,
} from "./googleDocs";

import {
  pointerDownHandler,
  keyDownHandler,
  inputHandler,
  chatgptMutationHandler,
} from "./onEventHandlers";

// Global variables
let observer: MutationObserver | null = null;

const onMessage = (
  msg: any,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (res?: any) => void
) => {
  if (msg.type === "CONTENT_SCRIPT_LOADED_ACK") {
  }
  else if (msg.type === "REMOVE_CONTENT_SCRIPT") {
    deinit();
    removeMutationEventListener(observer);
    removeGoogleDocsEventListener();
    sendResponse({ ok: true, from: "content-script", at: now() });
    chrome.runtime.onMessage.removeListener(onMessage);
  }
  else if (msg.type === "PING") {
    sendResponse({ ok: true, from: "content-script", at: now() });
  }
}

// Listen to messages from the background
chrome.runtime.onMessage.addListener(onMessage);

const init = () => {
  document.addEventListener("pointerdown", pointerDownHandler);
  document.addEventListener("keydown", keyDownHandler);
  document.addEventListener("input", inputHandler);
};

const deinit = () => {
  document.removeEventListener("pointerdown", pointerDownHandler);
  document.removeEventListener("keydown", keyDownHandler);
  document.removeEventListener("input", inputHandler);
};


chrome.runtime.sendMessage({
  type: "CONTENT_SCRIPT_LOADED",
  payload: { url: window.location.href }
}).then(res => {
  if (res.ok) {
    if (res.origin === "chatgpt") {
      init();
      const chatgptMutationConfig = {
        childList: true, // Watch for addition or removal of child nodes
        // attributes: true, // Watch for changes to attributes
        subtree: true,   // Watch for changes in descendant nodes
        characterData: true,
      };
      observer = addMutationEventListener(
        document.body,
        chatgptMutationConfig,
        chatgptMutationHandler()
      )
    }
    else if (res.origin === "googledocs") {

      // const iframe = document.querySelector('iframe.docs-texteventtarget-iframe') as HTMLIFrameElement | null;
      // if (iframe && iframe.contentDocument) {
      //   const contentEditableElement = iframe.contentDocument.querySelector('[contenteditable="true"]') as HTMLElement | null;
      //   if (contentEditableElement) {
      //     contentEditableElement.addEventListener('keydown', keyDownHandler);
      //   }
      // }
      const googleDocsConfig = {
        methods: ["POST"],
        url: ["/save", "/assistwriting"]
      };
      addGoogleDocsEventListener(
        googleDocsConfig,
        googleDocsHandler()
      );
    }
    else {
      init();
    }
  }
});
